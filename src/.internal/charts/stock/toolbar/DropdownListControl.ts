import { StockControl, IStockControlSettings, IStockControlPrivate, IStockControlEvents } from "./StockControl.js";
import { DropdownList, IDropdownListItem } from "./DropdownList.js";

import * as $array from "../../../core/util/Array.js";
import * as $type from "../../../core/util/Type.js";

export interface IDropdownListControlSettings extends IStockControlSettings {
	currentItem?: string | IDropdownListItem;
	fixedLabel?: boolean;
	items?: Array<string | IDropdownListItem>;
	maxSearchItems?: number,
	searchable?: boolean;
	searchCallback?: (query: string) => IDropdownListItem[];
}

export interface IDropdownListControlPrivate extends IStockControlPrivate {
	dropdown?: DropdownList;
}

export interface IDropdownListControlEvents extends IStockControlEvents {
	selected: {
		item: string | IDropdownListItem;
	};
}

/**
 * A generic control which creates a searchable list of items in a dropdown.
 *
 * Can be used in a [[StockToolbar]].
 *
 * @see {@link https://www.amcharts.com/docs/v5/charts/stock/toolbar/dropdown-list-control/} for more info
 */
export class DropdownListControl extends StockControl {
	public static className: string = "DropdownListControl";
	public static classNames: Array<string> = StockControl.classNames.concat([DropdownListControl.className]);

	declare public _settings: IDropdownListControlSettings;
	declare public _privateSettings: IDropdownListControlPrivate;
	declare public _events: IDropdownListControlEvents;

	protected _afterNew() {
		// @todo still needed?
		super._afterNew();

		const button = this.getPrivate("button")!;
		button.className = button.className + " am5stock-control-dropdown";
	}

	protected _initElements(): void {
		super._initElements();

		// Disable icon
		//this.getPrivate("icon")!.style.display = "none";

		// Create list
		const dropdownSettings: any = {
			control: this,
			parent: this.getPrivate("button"),
			searchable: this.get("searchable", false),
			items: []
		}

		const maxSearchItems = this.get("maxSearchItems");
		if (maxSearchItems) {
			dropdownSettings.maxSearchItems = maxSearchItems;
		}

		const searchCallback = this.get("searchCallback");
		if (searchCallback) {
			dropdownSettings.searchCallback = searchCallback;
		}

		const items = this.get("items");
		let currentItem = this.get("currentItem");
		if (items) {
			$array.each(items, (item) => {
				const itemObject = $type.isString(item) ? {
					id: item,
					label: item
				} : item;
				dropdownSettings.items.push(itemObject);

				if ($type.isString(currentItem) && currentItem == itemObject.id) {
					currentItem = itemObject;
				}
			})
		}

		const dropdown = DropdownList.new(this._root, dropdownSettings);
		this.setPrivate("dropdown", dropdown);

		if (currentItem) {
			this.setItem(currentItem);
		}

		dropdown.events.on("closed", (_ev) => {
			this.set("active", false);
		});

		dropdown.events.on("invoked", (ev) => {
			this.setItem(ev.item);
			this.events.dispatch("selected", {
				type: "selected",
				item: ev.item,
				target: this
			});
		});

		this.on("active", (active) => {
			if (active) {
				//dropdown.setPrivate("currentId", $type.numberToString(this.get("strokeWidth")));
				this.setTimeout(() => dropdown.show(), 10);
			}
			else {
				dropdown.hide();
			}
		});
	}

	public setItem(item: string | IDropdownListItem): void {
		if (this.get("fixedLabel") !== true) {
			const label = this.getPrivate("label")!;
			if ($type.isString(item)) {
				label.innerHTML = item;
			}
			else {
				if (item.icon) {
					const icon = this.getPrivate("icon")!;
					icon.innerHTML = "";
					icon.appendChild(item.icon.cloneNode(true));
					icon.style.display = "";
				}
				else {
					//icon.style.display = "none";
				}

				if (item.label) {
					label.innerHTML = item.label;
					label.style.display = "";
				}
				else {
					label.innerHTML = "";
					label.style.display = "none";
				}
			}
		}
	}

	public _beforeChanged() {
		super._beforeChanged();
		if (this.isDirty("items")) {
			const dropdown = this.getPrivate("dropdown");
			if (dropdown) {
				const items = this.get("items");
				const dropdownItems: IDropdownListItem[] = [];
				let currentItem = this.get("currentItem");
				if (items) {
					$array.each(items, (item) => {
						const itemObject = $type.isString(item) ? {
							id: item,
							label: item
						} : item;
						dropdownItems.push(itemObject);

						if ($type.isString(currentItem) && currentItem == itemObject.id) {
							currentItem = itemObject;
						}
					})
				}
				dropdown.set("items", dropdownItems)
			}
		}
	}

	protected _dispose(): void {
		super._dispose();
	}


}
