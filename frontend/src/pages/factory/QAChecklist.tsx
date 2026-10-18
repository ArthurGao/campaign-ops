import { useId, useState } from 'react';
import { HUMAN_REVIEW_ITEM, type Brief } from '@campaign-ops/core';
import { useBriefQa, useQaChecklist } from '@/api/queries/factory';
import { ActionButton } from '@/components/shared/ActionButton';
import { BlockedHint } from '@/components/shared/BlockedHint';
import { Checkbox } from '@/components/ui/checkbox';
import { Input, Textarea } from '@/components/ui/input';
import { Field } from '@/components/ui/label';
import { useRoleStore } from '@/store/role.store';

/** I-V2 automated checks shown beside each item; the person still ticks every item, the human review with a name. */
function automated(brief: Brief): Record<string, { ok: boolean; why: string }> {
  const r = brief.receipts.at(-1)!;
  const delivered = new Set(brief.receipts.flatMap((x) => x.assets.map((a) => a.ratio)));
  const missing = brief.deliverables.filter((d) => !delivered.has(d.ratio)).map((d) => d.ratio);
  const outside = r.factsUsed.filter((f) => !brief.allowedFacts.includes(f));
  return {
    'Ratios, lengths and checksums match the brief': {
      ok: !missing.length,
      why: missing.length ? `missing ${missing.join(', ')}` : 'all ratios delivered',
    },
    'facts_used ⊆ allowed_facts': {
      ok: !outside.length,
      why: outside.length ? `${outside.join(', ')} not allowed` : r.factsUsed.join(', '),
    },
    'Music license proof present': {
      ok: !!r.musicLicense.proof,
      why: r.musicLicense.proof ? 'proof link present' : 'no proof',
    },
    'Credits within cap': {
      ok: r.creditsUsed <= brief.costCap.maxCredits,
      why: `${r.creditsUsed} / ${brief.costCap.maxCredits}`,
    },
  };
}

export function QAChecklist({ brief }: { brief: Brief }) {
  const id = useId();
  const items = useQaChecklist().data ?? [];
  const qa = useBriefQa();
  const actorName = useRoleStore((s) => s.actorName);
  const [ticks, setTicks] = useState<Record<string, boolean>>({});
  const [reviewer, setReviewer] = useState(actorName);
  const [notes, setNotes] = useState('');
  const auto = automated(brief);
  const checklist = items.map((item) => ({ item, ok: !!ticks[item] }));
  const receipt = brief.receipts.at(-1)!;

  return (
    <div className="grid gap-4 rounded-md border border-warn/30 bg-surface p-4">
      <h3 className="text-sm font-semibold">QA receipt {receipt.version}</h3>
      <ul className="grid gap-1.5">
        {items.map((item) => {
          const a = auto[item];
          return (
            <li key={item}>
              <label className="flex items-start gap-2.5 rounded-md border border-rule px-3 py-2 text-sm hover:bg-ground">
                <Checkbox
                  className="mt-0.5"
                  checked={!!ticks[item]}
                  onCheckedChange={(v) => setTicks((t) => ({ ...t, [item]: v === true }))}
                />
                <span className="grid flex-1 gap-0.5">
                  <span className={item === HUMAN_REVIEW_ITEM ? 'font-semibold' : undefined}>
                    {item}
                  </span>
                  {a ? (
                    <span className={a.ok ? 'text-xs text-ok' : 'text-xs font-semibold text-bad'}>
                      Automated check: {a.ok ? 'passes' : 'fails'} — {a.why}
                    </span>
                  ) : (
                    <span className="text-xs text-ink-3">
                      Human check: a person watches the cut.
                    </span>
                  )}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Reviewer name"
          htmlFor={`${id}-rv`}
          help="Required to pass: who reviewed captions, voice-over and key frames."
        >
          <Input id={`${id}-rv`} value={reviewer} onChange={(e) => setReviewer(e.target.value)} />
        </Field>
        <Field
          label="Notes for the factory"
          htmlFor={`${id}-n`}
          help="Required to return the receipt."
        >
          <Textarea
            id={`${id}-n`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-9"
          />
        </Field>
      </div>
      <BlockedHint error={qa.error} />
      <div className="flex flex-wrap gap-2">
        <ActionButton
          variant="approve"
          permission="factory.write"
          loading={qa.isPending && qa.variables?.passed}
          onClick={() =>
            qa.mutate({
              id: brief.id,
              passed: true,
              checklist,
              reviewerName: reviewer,
              ...(notes ? { notes } : {}),
            })
          }
        >
          Pass QA → create packages
        </ActionButton>
        <ActionButton
          variant="danger"
          permission="factory.write"
          blockedReason={notes.trim() ? undefined : 'Write a note for the factory first.'}
          loading={qa.isPending && qa.variables?.passed === false}
          onClick={() =>
            qa.mutate({ id: brief.id, passed: false, checklist, notes, reviewerName: reviewer })
          }
        >
          Return to factory
        </ActionButton>
      </div>
    </div>
  );
}
