import type { XYSeries } from "../../xy/series/XYSeries.js";
import type { AxisRenderer } from "../../xy/axes/AxisRenderer.js";

import { Indicator, IIndicatorSettings, IIndicatorPrivate, IIndicatorEvents } from "./Indicator.js";
import { StockPanel } from "../StockPanel.js";
import { XYCursor } from "../../xy/XYCursor.js";
import { DateAxis } from "../../xy/axes/DateAxis.js";
import { GaplessDateAxis } from "../../xy/axes/GaplessDateAxis.js";
import { ValueAxis } from "../../xy/axes/ValueAxis.js";
import { AxisRendererX } from "../../xy/axes/AxisRendererX.js";
import { AxisRendererY } from "../../xy/axes/AxisRendererY.js";
import { Tooltip } from "../../../core/render/Tooltip.js";
import { StockLegend } from "../StockLegend.js";


export interface IChartIndicatorSettings extends IIndicatorSettings {
}

export interface IChartIndicatorPrivate extends IIndicatorPrivate {
}

export interface IChartIndicatorEvents extends IIndicatorEvents {
}


/**
 * A base class for chart-based [[StockChart]] indicators.
 *
 * @see {@link https://www.amcharts.com/docs/v5/charts/stock/indicators/} for more info
 */
export abstract class ChartIndicator extends Indicator {
	public static className: string = "ChartIndicator";
	public static classNames: Array<string> = Indicator.classNames.concat([ChartIndicator.className]);

	declare public _settings: IChartIndicatorSettings;
	declare public _privateSettings: IChartIndicatorPrivate;
	declare public _events: IChartIndicatorEvents;

	public panel!: StockPanel;
	public xAxis!: DateAxis<AxisRenderer>;
	public yAxis!: ValueAxis<AxisRenderer>;
	public cursor!: XYCursor;
	public legend!: StockLegend;

	protected _themeTag?: string;

	protected _afterNew() {
		super._afterNew();
		const stockChart = this.get("stockChart");
		const stockSeries = this.get("stockSeries");
		const seriesChart = stockSeries.chart;
		const root = this._root;
		if (stockChart && seriesChart) {
			// make chart
			let themeTags = ["indicator"];
			if (this._themeTag) {
				themeTags.push(this._themeTag);
			}
			const chart = stockChart.panels.push(StockPanel.new(root, { wheelY: "zoomX", panX: true, panY: false, themeTags: themeTags }));
			chart.addTag("indicator");
			this.panel = chart;

			stockChart.panels.events.on("removeIndex", (e) => {
				if (e.oldValue == chart) {
					stockChart.indicators.removeValue(this);
				}
			})

			const seriesXAxis = stockSeries.get("xAxis") as any;

			// xAxis
			const xRenderer = AxisRendererX.new(root, {});
			let xAxis: DateAxis<AxisRenderer> | GaplessDateAxis<AxisRenderer> | undefined;
			let baseInterval = seriesXAxis.get("baseInterval");
			let start = seriesXAxis.get("start");
			let end = seriesXAxis.get("end");

			if (seriesXAxis instanceof GaplessDateAxis) {
				xAxis = chart.xAxes.push(GaplessDateAxis.new(root, { renderer: xRenderer, baseInterval: baseInterval }));
			}
			else {
				xAxis = chart.xAxes.push(DateAxis.new(root, { renderer: xRenderer, baseInterval: baseInterval }));
			}

			xAxis.set("groupData", seriesXAxis.get("groupData"));
			xAxis.set("groupCount", seriesXAxis.get("groupCount"));

			xAxis.set("tooltip", Tooltip.new(root, { forceHidden: true }));

			xAxis.setAll({ start: start, end: end })
			this.xAxis = xAxis;

			// yAxis
			const yRenderer = AxisRendererY.new(root, {});
			const yAxis = chart.yAxes.push(ValueAxis.new(root, {
				renderer: yRenderer,
				tooltip: Tooltip.new(root, { forceHidden: true })
			}))
			this.yAxis = yAxis;

			const series = this._createSeries();
			this.series = series;

			// legend
			const legend = chart.topPlotContainer.children.insertIndex(0,
				StockLegend.new(root, { stockChart: this.get("stockChart") })
			);

			legend.data.push(series);

			const legendDataItem = legend.dataItems[legend.dataItems.length - 1];
			legendDataItem.set("panel", chart);
			legendDataItem.get("marker").set("forceHidden", true);

			const settingsButton = legendDataItem.get("settingsButton");
			settingsButton.setPrivate("customData", this);

			const editableSettings = this._editableSettings;
			if (!editableSettings || editableSettings.length == 0) {
				settingsButton.set("forceHidden", true);
			}

			chart.set("cursor", XYCursor.new(root, { yAxis: yAxis, xAxis: xAxis }));


		}
	}

	protected _dispose() {
		super._dispose();
		const stockChart = this.get("stockChart");
		stockChart.panels.removeValue(this.panel);
	}

	public async hide(duration?: number): Promise<any> {
		return Promise.all([
			super.hide(duration),
			this.panel.hide(duration)
		]);
	}

	public async show(duration?: number): Promise<any> {
		return Promise.all([
			super.show(duration),
			this.panel.show(duration)
		]);
	}

	protected abstract _createSeries(): XYSeries;
}