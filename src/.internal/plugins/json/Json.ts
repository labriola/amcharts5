import type { Root } from "../../core/Root.js";

import { Entity } from "../../core/util/Entity.js";
import { Sprite } from "../../core/render/Sprite.js";
import { Container } from "../../core/render/Container.js";
import { Color } from "../../core/util/Color.js";
import { Percent } from "../../core/util/Percent.js";
import { Template } from "../../core/util/Template.js";

import * as $type from "../../core/util/Type.js";
import * as $array from "../../core/util/Array.js";
import * as $object from "../../core/util/Object.js";

import type { IClasses } from "./Classes.js";
import classes from "./Classes.js";


interface IRef {
	[key: string]: any;
}


function isObject(value: any): value is { [key: string]: any } {
	return $type.isObject(value);
}


function lookupRef(refs: Array<IRef>, name: string): any {
	let i = refs.length;

	while (i--) {
		const sub = refs[i];

		if (name in sub) {
			return sub[name];
		}
	}

	throw new Error("Could not find ref #" + name);
}


interface IAdapter<E extends Entity> {
	key: keyof E["_settings"],
	callback: (value: E["_settings"][this["key"]], target: E, key: this["key"]) => E["_settings"][this["key"]],
}

type IParsedProperties = Array<(entity: Entity) => void>;

type IRefs = { [key: string]: any } | Array<{ [key: string]: any }>;

interface IChild {
	index: number | undefined,
	value: Sprite,
}

interface IParsedEntity<E extends Entity> {
	isValue: false,
	type: string | undefined,
	construct: typeof Entity | undefined,
	settings: object | undefined,
	adapters: Array<IAdapter<E>> | undefined,
	children: Array<IChild> | undefined,
	properties: IParsedProperties | undefined,
	index: number | undefined,
	value: object,
}

type IParsed<E extends Entity>
	= IParsedEntity<E>
	| { isValue: true, value: any };


function parseRef<E extends Entity>(value: string, refs: Array<IRef>): IParsed<E> {
	if (value[0] === "#") {
		const ref = value.slice(1);

		if (value[1] === "#") {
			return {
				isValue: true,
				value: ref,
			};

		} else {
			const path = ref.split(/\./g);

			let object = lookupRef(refs, path[0]);

			for (let i = 1; i < path.length; ++i) {
				object = object[path[i]];
			}

			return {
				isValue: true,
				value: object,
			};
		}

	} else {
		return {
			isValue: true,
			value,
		};
	}
}


function mergeEntity<E extends Entity>(entity: E, parsed: IParsedEntity<E>): void {
	if (parsed.adapters) {
		$array.each(parsed.adapters, (adapter) => {
			entity.adapters.add(adapter.key, adapter.callback);
		});
	}

	if (parsed.properties) {
		$array.each(parsed.properties, (fn) => {
			fn(entity);
		});
	}

	if (entity instanceof Container) {
		if (parsed.children) {
			parsed.children.forEach((child) => {
				if (child.index == null) {
					entity.children.push(child.value);

				} else {
					entity.children.insertIndex(child.index, child.value);
				}
			});
		}
	}
}


function constructEntity<E extends Entity>(root: Root, parsed: IParsedEntity<E>): E | object {
	if (!parsed.construct) {
		return parsed.value;
	}

	const entity = parsed.construct.new(root, parsed.settings || {}) as E;

	mergeEntity(entity, parsed);

	return entity;
}


class ParserState {
	protected _caching: { [key: string]: Promise<void> } = {};
	protected _cache: { [key: string]: typeof Entity } = {};
	protected _delayed: Array<() => void> = [];


	afterParse(): void {
		this._delayed.forEach((f) => {
			f();
		});
	}


	getClass(name: string): typeof Entity {
		return this._cache[name];
	}

	async storeClass(name: string): Promise<void> {
		const promise = classes[name as keyof IClasses];
		this._cache[name] = await promise() as typeof Entity;
	}

	cacheClass(name: string): Promise<void> {
		let promise = this._caching[name];

		if (promise == null) {
			promise = this._caching[name] = this.storeClass(name);
		}

		return promise;
	}


	async parseAsyncArray(array: Array<unknown>): Promise<void> {
		await Promise.all($array.map(array, (x) => this.parseAsync(x)));
	}

	async parseAsyncObject(object: object): Promise<void> {
		await Promise.all($array.map($object.keys(object), (key) => this.parseAsync(object[key])));
	}

	async parseAsyncRefs(refs: Array<object> | object): Promise<void> {
		if ($type.isArray(refs)) {
			await Promise.all($array.map(refs, (x) => this.parseAsyncRefs(x)));

		} else {
			await this.parseAsyncObject(refs);
		}
	}

	async parseAsync(value: unknown): Promise<void> {
		if ($type.isArray(value)) {
			await this.parseAsyncArray(value);

		} else if (isObject(value)) {
			if (value.type === "Color" || value.type === "Percent") {
				// Do nothing

			} else if (value.type === "Template") {
				await Promise.all([
					(value.refs ? this.parseAsyncRefs(value.refs) : Promise.resolve(undefined)),
					(value.settings ? this.parseAsyncObject(value.settings) : Promise.resolve(undefined)),
				]);

			} else if (value.__parse === true) {
				await this.parseAsyncObject(value);

			} else if (value.__parse !== false) {
				await Promise.all([
					(value.type ? this.cacheClass(value.type) : Promise.resolve(undefined)),
					(value.refs ? this.parseAsyncRefs(value.refs) : Promise.resolve(undefined)),
					(value.settings ? this.parseAsyncObject(value.settings) : Promise.resolve(undefined)),
					(value.properties ? this.parseAsyncObject(value.properties) : Promise.resolve(undefined)),
					(value.children ? this.parseAsyncArray(value.children) : Promise.resolve(undefined)),
				]);
			}
		}
	}


	parseArray(root: Root, value: Array<unknown>, refs: Array<IRef>): Array<unknown> {
		return $array.map(value, (value) => this.parse(root, value, refs));
	}

	parseChildren(root: Root, value: Array<{ [key: string]: any } | string>, refs: Array<IRef>): Array<IChild> {
		return $array.map(value, (value) => this.parseChild(root, value, refs));
	}


	parseSetting(root: Root, key: string, value: unknown, refs: Array<IRef>): unknown {
		if (key === "layout") {
			switch (value) {
			case "horizontal":
				return root.horizontalLayout;
			case "vertical":
				return root.verticalLayout;
			case "grid":
				return root.gridLayout;
			}
		}

		return this.parse(root, value, refs);
	}

	parseSettings<E extends Entity>(root: Root, object: object, refs: Array<IRef>): E["_settings"] {
		const settings: { [key: string]: any } = {};

		$array.each($object.keys(object), (key) => {
			settings[key] = this.parseSetting(root, key, object[key], refs);
		});

		return settings;
	}


	parseProperties(root: Root, object: object, refs: Array<IRef>): IParsedProperties {
		return $array.map($object.keys(object), (key) => {
			const parsed = this.parseValue(root, object[key], refs);

			return (entity: Entity) => {
				const run = () => {
					const old = entity[key] as unknown;

					if (old && old instanceof Entity) {
						// TODO merge it if the value is an Entity
						if (parsed.isValue) {
							throw new Error("Cannot merge value into Entity");
						}

						if (parsed.settings) {
							old.setAll(parsed.settings);
						}

						mergeEntity(old, parsed);

					} else if (parsed.isValue) {
						// Merge Array into List
						if (old && $type.isArray(parsed.value)) {
							$array.each(parsed.value, (value) => {
								(old as any).push(value);
							});

						} else {
							// TODO merge it if the value is an Entity
							(entity as any)[key] = parsed.value;
						}

					} else {
						(entity as any)[key] = constructEntity(root, parsed);
					}
				};

				if (key === "data") {
					this._delayed.push(run);

				} else if (key === "bullets") {
					const old = entity[key] as unknown;

					$type.assert(old != null);
					$type.assert(parsed.isValue);
					$type.assert($type.isArray(parsed.value));

					$array.each(parsed.value, (value) => {
						(old as any).push(() => value);
					});

				} else {
					run();
				}
			};
		});
	}


	parseRefsObject(root: Root, object: { [key: string]: any }, refs: Array<IRef>): IRef {
		const newRefs: IRef = {};

		$array.each($object.keys(object), (key) => {
			newRefs[key] = this.parse(root, object[key], refs);
		});

		return newRefs;
	}

	parseRefs(root: Root, object: IRefs, refs: Array<IRef>): Array<IRef> {
		if ($type.isArray(object)) {
			const length = object.length;

			for (let i = 0; i < length; ++i) {
				refs = refs.concat([this.parseRefsObject(root, object[i] as any, refs)]);
			}

		} else {
			refs = refs.concat([this.parseRefsObject(root, object, refs)]);
		}

		return refs;
	}


	parseChild(root: Root, value: { [key: string]: any } | string, refs: Array<IRef>): IChild {
		if ($type.isString(value)) {
			return {
				index: undefined,
				value: parseRef<Sprite>(value, refs).value,
			};

		} else if (value.ref != null) {
			const index = (value.index == null ? undefined : value.index);

			return {
				index,
				value: parseRef<Sprite>(value.ref, refs).value,
			};

		} else {
			const parsed = this.parseEntity<Sprite>(root, value, refs);

			return {
				index: parsed.index,
				value: constructEntity(root, parsed) as Sprite,
			};
		}
	}

	parseEntity<E extends Entity>(root: Root, value: { [key: string]: any }, refs: Array<IRef>): IParsedEntity<E> {
		if (value.refs) {
			refs = this.parseRefs(root, value.refs, refs);
		}

		const construct = (value.type ? this.getClass(value.type) : undefined);
		const settings = (value.settings ? this.parseSettings(root, value.settings, refs) : undefined);
		const properties = (value.properties ? this.parseProperties(root, value.properties, refs) : undefined);
		const children = (value.children ? this.parseChildren(root, value.children, refs) : undefined);

		const index = (value.index == null ? undefined : value.index);

		return {
			isValue: false,
			type: value.type,
			construct,
			settings,
			adapters: value.adapters,
			children,
			properties,
			index,
			value,
		};
	}

	parseValue<E extends Entity>(root: Root, value: any, refs: Array<IRef>): IParsed<E> {
		if (value instanceof Entity) {
			return { isValue: true, value: value };

		} else if ($type.isArray(value)) {
			return {
				isValue: true,
				value: this.parseArray(root, value, refs),
			};

		} else if (isObject(value)) {
			if (value.type === "Color") {
				return {
					isValue: true,
					value: Color.fromAny(value.value),
				};

			} else if (value.type === "Percent") {
				return {
					isValue: true,
					value: new Percent(value.value),
				};

			} else if (value.type === "Template") {
				if (value.refs) {
					refs = this.parseRefs(root, value.refs, refs);
				}

				const settings = (value.settings ? this.parseSettings(root, value.settings, refs) : {});

				return {
					isValue: true,
					value: Template.new(settings),
				};

			} else if (value.__parse === true) {
				return {
					isValue: true,
					value: this.parseSettings(root, value, refs),
				};

			} else if (value.__parse === false) {
				return {
					isValue: true,
					value,
				};

			} else {
				return this.parseEntity(root, value, refs);
			}

		} else if ($type.isString(value)) {
			return parseRef(value, refs);

		} else {
			return {
				isValue: true,
				value,
			};
		}
	}

	parse<E extends Entity>(root: Root, value: unknown, refs: Array<IRef>): E | object {
		const parsed = this.parseValue<E>(root, value, refs);

		if (parsed.isValue) {
			return parsed.value;

		} else {
			return constructEntity<E>(root, parsed);
		}
	}
}

export interface IParseSettings {
	parent?: Container;
}

/**
 * A parser for JSON based chart configs.
 *
 * @see {@link https://www.amcharts.com/docs/v5/concepts/serializing/} for more info
 * @since 5.3.0
 */
export class JsonParser {
	protected _root: Root;

	/**
	 * IMPORTANT! Do not instantiate this class via `new Class()` syntax.
	 *
	 * Use static method `Class.new()` instead.
	 *
	 * @see {@link https://www.amcharts.com/docs/v5/getting-started/#New_element_syntax} for more info
	 * @ignore
	 */
	constructor(root: Root, isReal: boolean) {
		if (!isReal) {
			throw new Error("You cannot use `new Class()`, instead use `Class.new()`");
		}

		this._root = root;
	}

	/**
	 * Use this method to create an instance of this class.
	 *
	 * @see {@link https://www.amcharts.com/docs/v5/getting-started/#New_element_syntax} for more info
	 * @param   root      Root element
	 * @return            Instantiated object
	 */
	static new<C extends typeof JsonParser, T extends InstanceType<C>>(this: C, root: Root): T {
		return (new this(root, true)) as T;
	}

	/**
	 * Parses and creates chart objects from simple objects.
	 *
	 * @param   object  Serialized data
	 * @return          A promise of a target object
	 */
	async parse<E extends Entity>(object: unknown, settings: IParseSettings = {}): Promise<E> {
		const state = new ParserState();

		await state.parseAsync(object);

		const output = state.parse(this._root, object, []) as E;

		if (settings.parent) {
			if (output instanceof Sprite) {
				settings.parent.children.push(output);

			} else {
				throw new Error("When using the parent setting, the entity must be a Sprite");
			}
		}

		state.afterParse();

		return output;
	}

	/**
	 * Parses and creates chart objects from JSON string.
	 *
	 * @param   string  JSON string
	 * @return          A promise of a target object
	 */
	async parseString<E extends Entity>(string: string, settings: IParseSettings = {}): Promise<E> {
		return await this.parse(JSON.parse(string), settings);
	}
}
