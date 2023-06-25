import type { IIndicatorEditableSetting } from "./Indicator.js";
import type { XYSeries } from "../../xy/series/XYSeries.js";

import { ChartIndicator, IChartIndicatorSettings, IChartIndicatorPrivate, IChartIndicatorEvents } from "./ChartIndicator.js";
import { LineSeries } from "../../xy/series/LineSeries.js";

import * as $array from "../../../core/util/Array.js";

export interface IChaikinMoneyFlowSettings extends IChartIndicatorSettings {

	/**
	 * Main volume series of the [[StockChart]].
	 */
	volumeSeries: XYSeries;

}

export interface IChaikinMoneyFlowPrivate extends IChartIndicatorPrivate {
}

export interface IChaikinMoneyFlowEvents extends IChartIndicatorEvents {
}


/**
 * An implementation of a [[StockChart]] indicator.
 *
 * @see {@link https://www.amcharts.com/docs/v5/charts/stock/indicators/} for more info
 */
export class ChaikinMoneyFlow extends ChartIndicator {
	public static className: string = "ChaikinMoneyFlow";
	public static classNames: Array<string> = ChartIndicator.classNames.concat([ChaikinMoneyFlow.className]);

	declare public _settings: IChaikinMoneyFlowSettings;
	declare public _privateSettings: IChaikinMoneyFlowPrivate;
	declare public _events: IChaikinMoneyFlowEvents;

	/**
	 * Indicator series.
	 */
	declare public series: LineSeries;

	public _editableSettings: IIndicatorEditableSetting[] = [{
		key: "period",
		name: this.root.language.translateAny("Period"),
		type: "number"
	}, {
		key: "seriesColor",
		name: this.root.language.translateAny("Color"),
		type: "color"
	}];

	protected _themeTag: string = "chaikinmoneyflow";

	public _createSeries(): LineSeries {
		return this.panel.series.push(LineSeries.new(this._root, {
			themeTags: ["indicator"],
			xAxis: this.xAxis,
			yAxis: this.yAxis,
			valueXField: "valueX",
			valueYField: "cmf",
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

			const dataItems = this.get("stockSeries").dataItems;
			const volumeSeries = this.get("volumeSeries");
			this.setRaw("field", "close");

			let data: Array<any> = this._getDataArray(dataItems);
			let i = 0;
			$array.each(dataItems, (dataItem) => {
				let close = dataItem.get("valueY") as number;
				if (close != null) {
					let low = dataItem.get("lowValueY", close) as number;
					let high = dataItem.get("highValueY", close) as number;

					let volume = 1;

					const volumeDI = volumeSeries.dataItems[i];
					if (volumeDI) {
						volume = volumeDI.get("valueY", 1);
					}

					let mf = ((close - low) - (high - close)) / (high - low)
					if (high == low) {
						mf = 0;
					}

					let mfv = mf * volume;
					data[i].mfv = mfv;
					data[i].volume = volume;
				}
				i++;
			})

			const period = this.get("period", 20);
			i = 0;
			$array.each(data, (dataItem) => {
				if (i >= period - 1) {
					let mfv = 0;
					let volume = 0;

					for (let j = i; j > i - period; j--) {
						mfv += data[j].mfv;
						volume += data[j].volume;
					}
					dataItem.cmf = mfv / volume;
				}
				i++;
			})

			this.series.data.setAll(data);
		}
	}
}