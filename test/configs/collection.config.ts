import genericConfig from "@/contributions/generic/config";
// import { HiDesktopComputer } from "react-icons/hi";

export default genericConfig({
  title: "Collection",
  description: "Test Collection",
  // icon: HiDesktopComputer,
  // color: "slate",
  // useFilesOnServer: {
  //   links: "apps.yaml",
  // },
  options: {
    // TODO
    commit: async ({ files, timestamp, body: { name, url, category } }) => {
      throw new Error("Testing!");
    },
    fields: {
      myCollection: {
        type: "collection",
        limit: 3, // UI Disaply
        // showAtLeast: 2, // UI Disaply
        validation: { required: true }, // API Validationp
        title: "Collection Test",
        // addButton: true,
        // addButton: "Create a new item",
        fields: {
          title: {
            title: "Test Text",
            type: "text",
            validation: { required: true, url: true },
          },
          url: {
            title: "Test URL",
            type: "text",
          },
          image: {
            title: "Test Image",
            type: "image",
          },
          subCollection: {
            type: "collection",
            title: "Sub Collection",
            limit: 4,
            validation: { required: true, min: 2 },
            fields: {
              title: {
                title: "Test Text",
                type: "text",
              },
              url: {
                title: "Test URL",
                type: "text",
              },
            },
          },
        },
      },
    },
  },
});
