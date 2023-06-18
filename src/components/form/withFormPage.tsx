import { notFound } from "next/navigation";

import { getContribution } from "@/lib/config";
import useUser from "@/components/common/useUser";

// import fetchFiles from "@/lib/fetchFiles";

type PageProps = {
  params: {
    repo: string;
    contribution: string;
  };
};

export default function withFormPage(Page: React.FC<any>, Form: React.FC<any>) {
  // Nextjs 13: Optional route parameters are not yet supported for now
  // we use this workaround using [[...type]], trigger 404 if missing
  return async function FormPage({
    params: { repo, contribution },
  }: PageProps) {
    let config;
    try {
      config = getContribution(repo, contribution);
    } catch {
      notFound();
    }

    const user = await useUser();
    // TODO dynamic fetch on client side
    const files = {}; // await fetchFiles({config, fields}, true);

    return (
      <Page {...{ user, config, files }}>
        {/* needs to be rendered seperately because it's a client side component */}
        {/* we can't pass the whole config directly; just pass names, and it gets queried again client side */}
        <Form {...{ repo, user, contribution, files }} />
      </Page>
    );
  };
}