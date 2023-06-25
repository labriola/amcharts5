import type { DataItem } from "../../core/render/Component.js";
import type { FlowNode } from "./FlowNode.js";
import type { Sankey } from "./Sankey.js";
import type { Bullet } from "../../core/render/Bullet.js";

import { Template } from "../../core/util/Template.js";
import { ListTemplate } from "../../core/util/List.js";
import { FlowNodes, IFlowNodesSettings, IFlowNodesDataItem, IFlowNodesPrivate, IFlowNodesEvents } from "./FlowNodes.js";
import { RoundedRectangle } from "../../core/render/RoundedRectangle.js";

export interface ISankeyNodesDataItem extends IFlowNodesDataItem {
	rectangle: RoundedRectangle;
}

export interface ISankeyNodesSettings extends IFlowNodesSettings {
}

export interface ISankeyNodesPrivate extends IFlowNodesPrivate {
}

export interface ISankeyNodesEvents extends IFlowNodesEvents {
}

/**
 * Holds instances of nodes for a [[Sankey]] series.
 */
export class SankeyNodes extends FlowNodes {
	public static className: string = "SankeyNodes";
	public static classNames: Array<string> = FlowNodes.classNames.concat([SankeyNodes.className]);

	declare public _settings: ISankeyNodesSettings;
	declare public _privateSettings: ISankeyNodesPrivate;
	declare public _dataItemSettings: ISankeyNodesDataItem;
	declare public _events: ISankeyNodesEvents;

	/**
	 * List of rectangle elements.
	 *
	 * @default new ListTemplate<RoundedRectangle>
	 */
	public readonly rectangles: ListTemplate<RoundedRectangle> = new ListTemplate(
		Template.new({}),
		() => RoundedRectangle._new(this._root, { themeTags: ["shape"] }, [this.rectangles.template])
	);

	/**
	 * Related [[Sankey]] series.
	 */
	public flow: Sankey | undefined;

	/**
	 * @ignore
	 */
	public makeNode(dataItem: DataItem<this["_dataItemSettings"]>): FlowNode {
		const flow = this.flow;

		const node = super.makeNode(dataItem, "sankey");

		const rectangle = node.children.insertIndex(0, this.rectangles.make());
		this.rectangles.push(rectangle);
		rectangle._setSoft("fill", dataItem.get("fill"));
		dataItem.set("rectangle", rectangle);

		node.events.on("dragged", () => {
			const d3SankeyNode = (node.dataItem as DataItem<ISankeyNodesDataItem>).get("d3SankeyNode");
			if (d3SankeyNode) {
				if (flow) {
					if (flow.get("orientation") == "horizontal") {
						d3SankeyNode.x0 = node.x();
						d3SankeyNode.y0 = node.y();
					}
					else {
						d3SankeyNode.x0 = node.y();
						d3SankeyNode.y0 = node.x();
					}

					flow.updateSankey();
				}
			}
		})

		const label = this.labels.make();
		this.labels.push(label);

		if (flow) {
			label.addTag(flow.get("orientation", ""));
		}
		node.children.push(label);
		dataItem.set("label", label);

		label._setDataItem(dataItem);
		rectangle._setDataItem(dataItem);

		return node;
	}

	public _positionBullet(bullet: Bullet) {
		const sprite = bullet.get("sprite");
		if (sprite) {
			const dataItem = sprite.dataItem as DataItem<this["_dataItemSettings"]>;
			if (dataItem) {
				const sprite = bullet.get("sprite");
				if (sprite) {
					const rectangle = dataItem.get("rectangle");
					const node = dataItem.get("node");
					const locationX = bullet.get("locationX", 0.5);
					const locationY = bullet.get("locationY", 0.5);
					if (rectangle) {
						sprite.setAll({ x: node.x() + rectangle.width() * locationX, y: node.y() + rectangle.height() * locationY });
					}
				}
			}
		}
	}

	/**
	 * @ignore
	 */
	public disposeDataItem(dataItem: DataItem<this["_dataItemSettings"]>) {
		super.disposeDataItem(dataItem);
		let rectangle = dataItem.get("rectangle");
		if (rectangle) {
			this.rectangles.removeValue(rectangle);
			rectangle.dispose();
		}
	}
}
