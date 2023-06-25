import type { IDisposer } from "../../../core/util/Disposer.js";
import type { StockChart } from "../StockChart.js";
import type { StockControl } from "./StockControl.js";

import { Entity, IEntitySettings, IEntityPrivate, IEntityEvents } from "../../../core/util/Entity.js"
import StockToolbarCSS from "./StockToolbarCSS.js";

import * as $array from "../../../core/util/Array.js";
import * as $utils from "../../../core/util/Utils.js";
//import * as $type from "../../../core/util/Type.js";

export interface IStockToolbarSettings extends IEntitySettings {

	/**
	 * A [[StockChart]] the toolbar is for.
	 */
	stockChart: StockChart;

	/**
	 * A reference to an element in the document to place tools in.
	 */
	container: HTMLElement;

	/**
	 * A list of tools to show in toolbar.
	 */
	controls?: StockControl[];

	/**
	 * If set to `false` the toolbar will not load default CSS.
	 *
	 * @default true
	 */
	useDefaultCSS?: boolean;

	/**
	 * Menu will disable all interactions for the underlying chart when using
	 * tools.
	 *
	 * @default true
	 */
	deactivateRoot?: boolean;

}

export interface IStockToolbarPrivate extends IEntityPrivate {
}

export interface IStockToolbarEvents extends IEntityEvents {
	created: {}
}

/**
 * @todo revview
 */
export class StockToolbar extends Entity {
	public static className: string = "StockToolbar";
	public static classNames: Array<string> = Entity.classNames.concat([StockToolbar.className]);

	declare public _settings: IStockToolbarSettings;
	declare public _privateSettings: IStockToolbarPrivate;
	declare public _events: IStockToolbarEvents;

	private _cssDisposer?: IDisposer;

	protected _afterNew() {
		super._afterNew();

		// Inherit default themes from chart
		this._defaultThemes = this.get("stockChart")._defaultThemes;
		super._afterNewApplyThemes();

		this._initControls();
		this.loadDefaultCSS();

		this._root.addDisposer(this);

		this.events.dispatch("created", {
			type: "created",
			target: this
		});
	}

	public _afterChanged() {
		super._afterChanged();

		if (this.isDirty("container")) {
			// TODO
		}

		if (this.isDirty("useDefaultCSS")) {
			if (this.get("useDefaultCSS")) {
				this.loadDefaultCSS();
			}
			else if (this._cssDisposer) {
				this._cssDisposer.dispose();
			}
		}

		if (this.isDirty("controls")) {
			this._initControls();
		}

	}

	protected _dispose(): void {
		super._dispose();

		if (this._cssDisposer) {
			this._cssDisposer.dispose();
		}

		const controls = this.get("controls", []);
		$array.each(controls, (control, _index) => {
			control.dispose();
		});
	}

	private _initControls(): void {
		const controls = this.get("controls", []);
		$array.each(controls, (control, _index) => {
			if (!control.getPrivate("toolbar")) {
				// @todo insert at specific index
				control.setPrivate("toolbar", this);
				this.get("container")!.appendChild(control.getPrivate("button")!);
			}
		});
	}

	/**
	 * Loads the default CSS.
	 *
	 * @ignore Exclude from docs
	 */
	public loadDefaultCSS(): void {
		const disposer = StockToolbarCSS($utils.getShadowRoot(this._root.dom), this._root);
		this._disposers.push(disposer);
		this._cssDisposer = disposer;
	}

}