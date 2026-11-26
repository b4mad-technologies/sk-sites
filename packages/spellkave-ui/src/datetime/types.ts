export interface DateTimePickerProps {
	class?: string;
	id?: string;
	label: string;
	description?: string;
	/** ISO-8601 instant with a Z suffix. The field edits the UTC wall clock. */
	iso?: string;
	disabled?: boolean;
	name?: string;
}
