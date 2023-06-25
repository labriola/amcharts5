import type { DataItem } from "../../core/render/Component.js";
import type { FlowNode } from "./FlowNode.js";
import type { Chord } from "./Chord.js";
import type { Bullet } from "../../core/render/Bullet.js";

import { FlowNodes, IFlowNodesSettings, IFlowNodesDataItem, IFlowNodesPrivate, IFlowNodesEvents } from "./FlowNodes.js";
import { Slice } from "../../core/render/Slice.js";
import { Template } from "../../core/util/Template.js";
import { ListTemplate } from "../../core/util/List.js";
import { RadialLabel } from "../../core/render/RadialLabel.js";

import * as $math from "../../core/util/Math.js";

export interface IChordNodesDataItem extends IFlowNodesDataItem {

	/**
	 * Node [[Slice]] element.
	 */
	slice: Slice;

	/**
	 * Node label element.
	 */
	label: RadialLabel;

}

export interface IChordNodesSettings extends IFlowNodesSettings {
}

export interface IChordNodesPrivate extends IFlowNodesPrivate {
}

export interface IChordNodesEvents extends IFlowNodesEvents {
}

/**
 * Holds instances of nodes for a [[Chord]] series.
 */
export class ChordNodes extends FlowNodes {
	public static className: string = "ChordNodes";
	public static classNames: Array<string> = FlowNodes.classNames.concat([ChordNodes.className]);

	/**
	 * List of label elements.
	 *
	 * @default new ListTemplate<RadialLabel>
	 */
	public readonly labels: ListTemplate<RadialLabel> = new ListTemplate(
		Template.new({}),
		() => RadialLabel._new(this._root, {}, [this.labels.template])
	);

	declare public _settings: IChordNodesSettings;
	declare public _privateSettings: IChordNodesPrivate;
	declare public _dataItemSettings: IChordNodesDataItem;
	declare public _events: IChordNodesEvents;

	/**
	 * Related [[Chord]] series.
	 */
	public flow: Chord | undefined;

	protected _dAngle: number = 0;

	/**
	 * List of slice elements.
	 *
	 * @default new ListTemplate<Slice>
	 */
	public readonly rectangles: ListTemplate<Slice> = new ListTemplate(
		Template.new({}),
		() => Slice._new(this._root, { themeTags: ["shape"] }, [this.rectangles.template])
	);

	/**
	 * @ignore
	 */
	public makeNode(dataItem: DataItem<this["_dataItemSettings"]>): FlowNode {
		const node = super.makeNode(dataItem, "chord");

		const slice = node.children.insertIndex(0, this.rectangles.make());
		dataItem.set("slice", slice);
		slice._setSoft("fill", dataItem.get("fill"));

		const label = this.labels.make();
		this.labels.push(label);
		label.addTag("flow");
		label.addTag("chord");
		label.addTag("node");

		node.children.push(label);
		dataItem.set("label", label);

		node.events.on("dragstart", (e) => {
			let point = this.toLocal(e.point);
			const angle = $math.getAngle({ x: 0, y: 0 }, point);
			if (this.flow) {
				this._dAngle = this.flow.get("startAngle", 0) - angle;
			}
		})

		node.events.on("dragged", (e) => {
			let point = this.toLocal(e.point);
			const angle = $math.getAngle({ x: 0, y: 0 }, point);

			node.setAll({ x: 0, y: 0 });
			if (this.flow) {
				this.flow.set("startAngle", angle + this._dAngle);
			}
		})

		label._setDataItem(dataItem);
		slice._setDataItem(dataItem);

		return node;
	}

	public _positionBullet(bullet: Bullet) {
		const sprite = bullet.get("sprite");
		if (sprite) {
			const dataItem = sprite.dataItem as DataItem<this["_dataItemSettings"]>;
			if (dataItem) {
				const sprite = bullet.get("sprite");
				if (sprite) {
					const slice = dataItem.get("slice");
					const locationX = bullet.get("locationX", 0.5);
					const locationY = bullet.get("locationY", 0.5);
					if (slice) {
						const radius = slice.get("radius", 0);
						const innerRadius = slice.get("innerRadius", 0);
						const bulletRadius = innerRadius + (radius - innerRadius) * locationY;
						const angle = slice.get("startAngle", 0) + slice.get("arc", 0) * locationX;
						sprite.setAll({ x: bulletRadius * $math.cos(angle), y: bulletRadius * $math.sin(angle) });
					}
				}
			}
		}
	}
}
