import Button from './Button';

/**
 * FormLayout — consistent label/input/error spacing and action row for every form.
 */
const FormLayout = ({
  children,
  onSubmit,
  onCancel,
  submitLabel = 'Save',
  submitting = false,
}) => {
  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="flex flex-col gap-4">{children}</div>

      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
        {onCancel && (
          <Button variant="outline" type="button" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" loading={submitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
};

export default FormLayout;
