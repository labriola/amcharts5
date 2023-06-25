import type { Series } from "./Series.js";

import { Chart, IChartSettings, IChartPrivate, IChartEvents } from "./Chart.js";
import { Container } from "../../core/render/Container.js";
import { ListAutoDispose } from "../../core/util/List.js";
import { p100 } from "../../core/util/Percent.js";
import * as $array from "../../core/util/Array.js";
import type { ColorSet } from "../../core/util/ColorSet.js";

export interface ISerialChartSettings extends IChartSettings {
	/**
	 * A [[ColorSet]] to use when asigning colors for series.
	 *
	 * @see {@link https://www.amcharts.com/docs/v5/charts/xy-chart/series/#Series_colors} for more info
	 */
	colors?: ColorSet;
}

export interface ISerialChartPrivate extends IChartPrivate {
}

export interface ISerialChartEvents extends IChartEvents {
}

/**
 * A base class for all series-based charts.
 */
export abstract class SerialChart extends Chart {
	public static className: string = "SerialChart";
	public static classNames: Array<string> = Chart.classNames.concat([SerialChart.className]);

	declare public _settings: ISerialChartSettings;
	declare public _privateSettings: ISerialChartPrivate;
	declare public _seriesType: Series;
	declare public _events: ISerialChartEvents;

	/**
	 * A [[Container]] where chart will store all series.
	 *
	 * @default Container.new()
	 */
	public readonly seriesContainer: Container = Container.new(this._root, { width: p100, height: p100, isMeasured: false });

	/**
	 * A list of chart's series.
	 */
	public readonly series: ListAutoDispose<this["_seriesType"]> = new ListAutoDispose();

	protected _afterNew() {
		super._afterNew();

		this._disposers.push(this.series);

		const children = this.seriesContainer.children;

		this._disposers.push(this.series.events.onAll((change) => {
			if (change.type === "clear") {
				$array.each(change.oldValues, (series) => {
					this._removeSeries(series);
				})
				const colors = this.get("colors");
				if (colors) {
					colors.reset();
				}

			} else if (change.type === "push") {
				children.moveValue(change.newValue);
				this._processSeries(change.newValue);
			} else if (change.type === "setIndex") {
				children.setIndex(change.index, change.newValue);
				this._processSeries(change.newValue);
			} else if (change.type === "insertIndex") {
				children.insertIndex(change.index, change.newValue);
				this._processSeries(change.newValue);
			} else if (change.type === "removeIndex") {
				this._removeSeries(change.oldValue);
			} else if (change.type === "moveIndex") {
				children.moveValue(change.value, change.newIndex);
				this._processSeries(change.value);
			} else {
				throw new Error("Unknown IListEvent type");
			}
		}));
	}

	protected _processSeries(series: this["_seriesType"]) {
		series.chart = this;
		series._placeBulletsContainer(this);
	}

	protected _removeSeries(series: this["_seriesType"]) {
		if (!series.isDisposed()) {
			this.seriesContainer.children.removeValue(series);
			series._removeBulletsContainer();
		}
	}
}
