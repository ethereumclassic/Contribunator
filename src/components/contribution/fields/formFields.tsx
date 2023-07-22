import type { Fields } from "@/types";

import TextInput from "./text/textInput";
import ChoiceInput from "./choice/choiceInput";
import ImageInput from "./image/imageInput";
import ImagesInput from "./image/imagesInput";
import InfoField from "./info/infoField";
import CollectionInput from "./collection/collectionInput";

const components: any = {
  text: TextInput,
  choice: ChoiceInput,
  image: ImageInput,
  images: ImagesInput,
  info: InfoField,
  collection: CollectionInput,
};

export default function FormFields({ fields }: { fields: Fields }) {
  return (
    <>
      {Object.entries(fields).map(([name, val]) => {
        const Input = components[val.type];
        return <Input key={name} {...val} name={name} />;
      })}
    </>
  );
}
