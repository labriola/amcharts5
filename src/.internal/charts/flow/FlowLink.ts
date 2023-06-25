import type { DataItem } from "../../core/render/Component.js";
import { Graphics, IGraphicsSettings, IGraphicsPrivate } from "../../core/render/Graphics.js";
import type { IFlowNodesDataItem } from "./FlowNodes.js";
import type { IFlowDataItem, Flow } from "./Flow.js";
import type { IOrientationPoint, IPoint } from "../../core/util/IPoint.js";
import type { LinearGradient } from "../../core/render/gradients/LinearGradient.js";
import { Percent } from "../../core/util/Percent.js";

export interface IFlowLinkSettings extends IGraphicsSettings {

	/**
	 * Source node data item.
	 */
	source?: DataItem<IFlowNodesDataItem>;

	/**
	 * Source node data item.
	 */
	target?: DataItem<IFlowNodesDataItem>;

	/**
	 * Type of fill to use for links.
	 */
	fillStyle?: "solid" | "source" | "target" | "gradient" | "none";

	/**
	 * Type of outline to use for links.
	 */
	strokeStyle?: "solid" | "source" | "target" | "gradient" | "none";

}

export interface IFlowLinkPrivate extends IGraphicsPrivate {
}

/**
 * A base class for a flow link.
 */
export abstract class FlowLink extends Graphics {

	public series: Flow | undefined;

	declare public _settings: IFlowLinkSettings;
	declare public _privateSettings: IFlowLinkPrivate;

	public static className: string = "FlowLink";
	public static classNames: Array<string> = Graphics.classNames.concat([FlowLink.className]);

	declare protected _dataItem: DataItem<IFlowDataItem> | undefined;

	public _fillGradient: LinearGradient | undefined;
	public _strokeGradient: LinearGradient | undefined;

	public _changed() {
		super._changed();
		if (this.isDirty("fillStyle")) {
			const series = this.series;
			const dataItem = this.dataItem as DataItem<IFlowDataItem>;
			if (series && dataItem) {
				series._updateLinkColor(dataItem);
			}
		}
	}

	public abstract getPoint(location: number): IOrientationPoint;

	public _getTooltipPoint(): IPoint {
		let tooltipY = this.get("tooltipY");
		let position = 0.5;
		if (tooltipY instanceof Percent) {
			position = tooltipY.value;
		}

		return this.getPoint(position);
	}
}
