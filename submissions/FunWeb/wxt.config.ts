import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
	extensionApi: "chrome",
	modules: ["@wxt-dev/module-vue", "@wxt-dev/auto-icons"],

	manifest: {
		name: "Extension Name",
		description: "Extension Description should be written here",
		permissions: ["storage"],
		host_permissions:["https://*/*"]
	},

	srcDir: "src",
});
