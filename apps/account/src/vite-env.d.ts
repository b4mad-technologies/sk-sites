/// <reference types="vite/client" />

interface ImportMetaEnv {
	/** Override the same-origin proxy during `vite dev`; unset in production. */
	readonly VITE_SPELLKAVE_API_URL?: string;
	readonly VITE_SPELLKAVE_SITE_URL?: string;
	readonly VITE_SPELLKAVE_PLAY_URL?: string;
	readonly VITE_WORKOS_CLIENT_ID?: string;
	readonly VITE_WORKOS_ISSUER?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
