/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_SPELLKAVE_PUBLIC_SITE_URL?: string;
	/** @deprecated Seats use the Account API (`VITE_SPELLKAVE_API_URL`), not a direct play host. */
	readonly VITE_SPELLKAVE_PLAY_URL?: string;
	/** Account API base (`https://api.spellkave.com`); unset → default / dev mcp alias. */
	readonly VITE_SPELLKAVE_API_URL?: string;
	readonly VITE_WORKOS_CLIENT_ID?: string;
	readonly VITE_WORKOS_ISSUER?: string;
	/** DEV-only: absolute path to a play-stage token file (read by vite.config). */
	readonly VITE_SPELLKAVE_DEV_TOKEN_FILE?: string;
	/** DEV-only: token contents injected by vite.config from the file above. */
	readonly VITE_SPELLKAVE_DEV_TOKEN?: string;
	/** DEV-only: override catalog world db name for the local node. */
	readonly VITE_SPELLKAVE_DEV_DB?: string;
	readonly DEV: boolean;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
