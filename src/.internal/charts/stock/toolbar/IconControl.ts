import type { Percent } from "../../../core/util/Percent.js";

import { StockControl, IStockControlSettings, IStockControlPrivate, IStockControlEvents } from "./StockControl.js";
import { DropdownList, IDropdownListItem } from "./DropdownList.js";
import { StockIcons } from "./StockIcons.js";

import * as $array from "../../../core/util/Array.js";

export interface IIcon {
	svgPath: string;
	scale?: number;
	centerX?: Percent;
	centerY?: Percent;
	fillDisabled?: boolean;
}

export interface IIconControlSettings extends IStockControlSettings {
	icons: IIcon[];
}

export interface IIconControlPrivate extends IStockControlPrivate {
	list?: DropdownList;
}

export interface IIconControlEvents extends IStockControlEvents {
	selected: {
		icon: IIcon
	}
}

/**
 * Shows selection of icons to choose from for annotating [[StockChart]].
 *
 * This class is instantiated automatically, and should not be used standalone.
 */
export class IconControl extends StockControl {
	public static className: string = "IconControl";
	public static classNames: Array<string> = StockControl.classNames.concat([IconControl.className]);

	declare public _settings: IIconControlSettings;
	declare public _privateSettings: IIconControlPrivate;
	declare public _events: IIconControlEvents;

	protected _afterNew() {

		// Do parent stuff
		super._afterNew();

		// Create list of tools
		const list = DropdownList.new(this._root, {
			control: this,
			parent: this.getPrivate("button"),
			searchable: false
		});
		this.setPrivate("list", list);
		list.getPrivate("list")!.className = "am5stock-control-icons";

		list.events.on("closed", (_ev) => {
			this.set("active", false);
		});

		list.events.on("invoked", (ev) => {
			const item = <IIcon>JSON.parse(ev.item.id);
			let icon: IIcon | undefined;
			const icons = this.get("icons");
			$array.each(icons, (listIcon) => {
				if (item.svgPath == listIcon.svgPath) {
					icon = listIcon;
				}
			});
			if (icon) {
				this.setIcon(icon);
				this.events.dispatch("selected", {
					type: "selected",
					icon: icon,
					target: this
				});
			}
		});

		this.on("active", (active) => {
			if (active) {
				this.setTimeout(() => list.show(), 10);
			}
			else {
				list.hide();
			}
		});

		this._initIcons();
	}

	public setIcon(icon: IIcon): void {
		this.getPrivate("icon")!.innerHTML = "";
		this.getPrivate("icon")!.appendChild(this._getDrawingIcon(icon));
		//this.getPrivate("label")!.style.display = "none";
	}

	protected _initIcons(): void {
		const list = this.getPrivate("list")!;
		const icons = this.get("icons");
		const items: IDropdownListItem[] = [];
		$array.each(icons, (icon: IIcon) => {
			items.push({
				id: JSON.stringify(icon),
				label: "",
				icon: this._getDrawingIcon(icon)
			});
		})
		list.set("items", items);
	}

	public _getDrawingIcon(icon: IIcon): SVGElement {
		return StockIcons._getSVG({ viewbox: "0 0 50 50", path: icon.svgPath});
	}

	public _afterChanged() {
		super._afterChanged();

		if (this.isDirty("icons")) {
			this._initIcons();
		}
	}

	protected _dispose(): void {
		super._dispose();
	}


}
