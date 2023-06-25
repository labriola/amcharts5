import type { IIndicatorEditableSetting } from "./Indicator.js";
import type { XYSeries } from "../../xy/series/XYSeries.js";

import { ChartIndicator, IChartIndicatorSettings, IChartIndicatorPrivate, IChartIndicatorEvents } from "./ChartIndicator.js";
import { LineSeries } from "../../xy/series/LineSeries.js";

export interface IOnBalanceVolumeSettings extends IChartIndicatorSettings {

	/**
	 * Chart's main volume series.
	 */
	volumeSeries: XYSeries;

}

export interface IOnBalanceVolumePrivate extends IChartIndicatorPrivate {
}

export interface IOnBalanceVolumeEvents extends IChartIndicatorEvents {
}


/**
 * An implementation of a [[StockChart]] indicator.
 *
 * @see {@link https://www.amcharts.com/docs/v5/charts/stock/indicators/} for more info
 */
export class OnBalanceVolume extends ChartIndicator {
	public static className: string = "OnBalanceVolume";
	public static classNames: Array<string> = ChartIndicator.classNames.concat([OnBalanceVolume.className]);

	declare public _settings: IOnBalanceVolumeSettings;
	declare public _privateSettings: IOnBalanceVolumePrivate;
	declare public _events: IOnBalanceVolumeEvents;

	/**
	 * Indicator series.
	 */
	declare public series: LineSeries;

	public _editableSettings: IIndicatorEditableSetting[] = [{
		key: "seriesColor",
		name: this.root.language.translateAny("Color"),
		type: "color"
	}];

	protected _themeTag: string = "onbalancevolume";

	public _createSeries(): LineSeries {
		return this.panel.series.push(LineSeries.new(this._root, {
			themeTags: ["indicator"],
			xAxis: this.xAxis,
			yAxis: this.yAxis,
			valueXField: "valueX",
			valueYField: "obv",
			stroke: this.get("seriesColor"),
			fill: undefined
		}))
	}

	public _prepareChildren() {
		if (this.isDirty("volumeSeries")) {
			this._dataDirty = true;
		}
		super._prepareChildren();
	}

	/**
	 * @ignore
	 */
	public prepareData() {
		if (this.series) {

			this.setRaw("field", "close");

			const dataItems = this.get("stockSeries").dataItems;
			const volumeSeries = this.get("volumeSeries");

			let data: Array<any> = this._getDataArray(dataItems);
			let previous = 0;
			let len = data.length;

			if (volumeSeries && len > 1) {
				let cy = data[0].value_y as number;

				for (let i = 1; i < len; i++) {
					const dataItem = data[i];

					let c = dataItem.value_y;

					if (c != null) {
						const volumeDI = volumeSeries.dataItems[i];
						let volume = 0;
						if (volumeDI) {
							volume = volumeDI.get("valueY", 1);
						}

						let obv = previous;
						if (c > cy) {
							obv += volume;
						}
						else if (c < cy) {
							obv -= volume;
						}

						dataItem.obv = obv;

						previous = obv;
						cy = c;
					}
				}
			}

			this.series.data.setAll(data);
		}
	}
}