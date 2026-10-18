import { useSettings } from '@/api/queries/settings';
import { PageHeader } from '@/components/shared/Layout';
import { SkeletonRows } from '@/components/ui/skeleton';
import { copy } from '@/lib/copy';
import { FactoryAndReset, PeopleForm, ProhibitedWords, UtmTemplateForm } from './GeneralForms';
import { LandingPageChecks } from './LandingPageChecks';
import { ScopeForm } from './ScopeForm';

export default function SettingsPage() {
  const { data } = useSettings();
  return (
    <>
      <PageHeader title={copy.pages.settings.title} steps={[4]} lede={copy.pages.settings.lede} />
      {!data ? (
        <SkeletonRows rows={10} />
      ) : (
        <div className="grid gap-8 xl:grid-cols-2">
          <div className="grid content-start gap-8">
            <LandingPageChecks settings={data} />
            <ScopeForm settings={data} />
          </div>
          <div className="grid content-start gap-8">
            <PeopleForm settings={data} />
            <UtmTemplateForm settings={data} />
            <ProhibitedWords settings={data} />
            <FactoryAndReset settings={data} />
          </div>
        </div>
      )}
    </>
  );
}
