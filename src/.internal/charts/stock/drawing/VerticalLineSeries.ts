import type { ISpritePointerEvent } from "../../../core/render/Sprite.js";
import type { DataItem } from "../../../core/render/Component.js";
import type { Line } from "../../../core/render/Line.js";
import { SimpleLineSeries, ISimpleLineSeriesSettings, ISimpleLineSeriesPrivate, ISimpleLineSeriesDataItem } from "./SimpleLineSeries.js";
import type { Template } from "../../../core/util/Template.js";

export interface IVerticalLineSeriesDataItem extends ISimpleLineSeriesDataItem {
}

export interface IVerticalLineSeriesSettings extends ISimpleLineSeriesSettings {
}

export interface IVerticalLineSeriesPrivate extends ISimpleLineSeriesPrivate {
}

export class VerticalLineSeries extends SimpleLineSeries {
	public static className: string = "VerticalLineSeries";
	public static classNames: Array<string> = SimpleLineSeries.classNames.concat([VerticalLineSeries.className]);

	declare public _settings: IVerticalLineSeriesSettings;
	declare public _privateSettings: IVerticalLineSeriesPrivate;
	declare public _dataItemSettings: IVerticalLineSeriesDataItem;

	protected _tag = "vertical";

	protected _handleBulletDragged(event: ISpritePointerEvent) {
		super._handleBulletDragged(event);

		const dataItem = event.target.dataItem as DataItem<IVerticalLineSeriesDataItem>;
		const dataContext = dataItem.dataContext as any;

		if (dataContext) {
			const index = dataContext.index;
			const diP1 = this._di[index]["p1"];
			const diP2 = this._di[index]["p2"];

			const movePoint = this._movePointerPoint;

			if (diP1 && diP2 && movePoint) {
				const yAxis = this.get("yAxis");
				const xAxis = this.get("xAxis");

				const valueY = this._getYValue(yAxis.positionToValue(yAxis.coordinateToPosition(movePoint.y)));
				const valueX = this._getXValue(xAxis.positionToValue(xAxis.coordinateToPosition(movePoint.x)));

				this._setContext(diP1, "valueY", valueY, true);
				this._setContext(diP2, "valueY", valueY + 0.01, true);

				this._setContext(diP1, "valueX", valueX);
				this._setContext(diP2, "valueX", valueX);

				this._setXLocation(diP1, valueX);
				this._setXLocation(diP2, valueX);

				this._positionBullets(diP1);
				this._positionBullets(diP2);
			}
		}
	}

	protected _updateSegment(index: number) {
		if (this._di[index]) {
			const diP1 = this._di[index]["p1"];
			const diP2 = this._di[index]["p2"];
			if (diP1 && diP2) {
				this._setContext(diP2, "valueY", diP1.get("valueY", 0) + 0.01, true);
			}
		}
	}

	protected _handlePointerMoveReal() {

	}

	protected _updateExtensionLine(line: Line, template: Template<any>) {
		line.setAll({
			stroke: template.get("stroke"),
			strokeWidth: template.get("strokeWidth"),
			strokeDasharray: template.get("strokeDasharray"),
			strokeOpacity: template.get("strokeOpacity")
		})
	}	

	protected _handlePointerClickReal(event: ISpritePointerEvent) {
		if (this._drawingEnabled) {
			if (!this._isDragging) {
				this._index++;
				this._addPoints(event, this._index);
				this._isDrawing = false;
				this._updateSegment(this._index);
			}
		}
	}
}