import { HiOutlineInformationCircle } from "react-icons/hi";
import withDynamicField from "../withDynamicField";
import type { Dynamic, UnwrapDynamic } from "@/types";

export type Props = {
  type: "info";
  title: Dynamic<string>;
  icon?: boolean;
};

const dynamicProps = ["title"] as const;

function InfoField({
  title,
  icon,
}: UnwrapDynamic<Props, (typeof dynamicProps)[number]>) {
  return (
    <div className="flex text-secondary pt-6 first:pt-2 items-center justify-center font-bold text-sm">
      <div>{icon && <HiOutlineInformationCircle className="h-5 w-5" />}</div>
      <div className="text-left">{title}</div>
    </div>
  );
}

export default withDynamicField(InfoField);
