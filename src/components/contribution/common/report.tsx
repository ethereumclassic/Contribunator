import { DecoratedData, DecoratedDataItem } from "@/types";

function ReportCell({ fields }: { fields: DecoratedDataItem }) {
  return (
    <>
      {Object.values(fields).map((item, index) => {
        if (typeof item !== "object") {
          return;
        }
        if (item.field) {
          return (
            <div key={item.path}>
              <div className="font-bold mb-1">{item.fullTitle}</div>
              {["image", "images"].includes(item.field.type) ? (
                <div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.data.data} alt={item.data.alt} />
                  {item.data.alt && <div>{item.data.alt}</div>}
                </div>
              ) : (
                <div className="whitespace-pre-wrap">
                  {item.markdown || item.data}
                </div>
              )}
            </div>
          );
        }
        return <ReportCell key={index} fields={item} />;
      })}
    </>
  );
}

export default function Report({ decorated }: { decorated: DecoratedData }) {
  return <ReportCell fields={decorated} />;
}
