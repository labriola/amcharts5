import { Color } from "../core/util/Color.js";
import { Theme } from "../core/Theme.js";

/**
 * @ignore
 */
export class DatavizTheme extends Theme {
	protected setupDefaultRules() {
		super.setupDefaultRules();

		this.rule("ColorSet").setAll({
			colors: [Color.fromHex(0x283250), Color.fromHex(0x902c2d), Color.fromHex(0xd5433d), Color.fromHex(0xf05440)],
			reuse: false,
			passOptions: {
				lightness: 0.05,
				hue: 0
			}
		});
	}
}
