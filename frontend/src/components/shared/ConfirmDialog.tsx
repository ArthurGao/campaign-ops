import { useId, useState, type ReactNode } from 'react';
import type { ApiError } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BlockedHint } from './BlockedHint';

/**
 * Every state-changing action confirms and shows the reason it will record (docs/05 layout rule).
 * The dialog stays open with the inline hint when the API refuses.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  note,
  tone = 'primary',
  onConfirm,
  children,
}: {
  open: boolean;
  onOpenChange(open: boolean): void;
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  /** Ask for a note: 'required' blocks confirm until filled. */
  note?: { label: string; required?: boolean; placeholder?: string };
  tone?: 'primary' | 'danger' | 'approve';
  onConfirm(note: string): Promise<unknown>;
  children?: ReactNode;
}) {
  const id = useId();
  const [text, setText] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const close = (o: boolean) => {
    if (!o) {
      setText('');
      setError(null);
    }
    onOpenChange(o);
  };

  const submit = async () => {
    setPending(true);
    setError(null);
    try {
      await onConfirm(text.trim());
      close(false);
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader title={title} description={description} />
        {children}
        {note ? (
          <div className="grid gap-1.5">
            <Label htmlFor={id}>
              {note.label}
              {note.required ? (
                <span className="text-bad"> *</span>
              ) : (
                <span className="font-normal text-ink-3"> (optional)</span>
              )}
            </Label>
            <Textarea
              id={id}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={note.placeholder}
            />
          </div>
        ) : null}
        <BlockedHint error={error} />
        <DialogFooter>
          <Button variant="ghost" onClick={() => close(false)}>
            Cancel
          </Button>
          <Button
            variant={tone}
            loading={pending}
            disabled={!!note?.required && !text.trim()}
            onClick={submit}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
