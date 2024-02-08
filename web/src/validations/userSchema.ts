import byteToMb from "@/helper/byteToMb";
import * as yup from "yup";

const userSchema = yup.object({
  name: yup
    .string()
    .required("name is required")
    .min(3, "name should contain aleast 3 character")
    .max(30, "name should contain at most 30 characater"),
  email: yup.string().required("email is requird "),

  hobbies: yup
    .mixed<Array<string> | []>()
    .test("hobbies", "please select at least one hobby", (data) => {
      const isValid = data ? data.length >= 1 : false;
      return isValid;
    }),
  profile: yup
    .mixed()
    .test("required", "profile picture is required", (file: any) => {
      return file ? true : false;
    })
    .test(
      "profileType",
      "only jpeg , png , jpg , svg , webp file are allowed",
      (file: any) => {
        const isValid =
          file?.type === "image/jpeg" ||
          file?.type === "image/png" ||
          file?.type === "image/jpg" ||
          file?.type === "image/svg" ||
          file?.type === "image/webp";

        return isValid;
      }
    )
    .test(
      "profileSize",
      "profile picture size should less than 5mb",
      (file: any) => {
        const isValid = byteToMb(file.size) < 5;
        return isValid;
      }
    ),
});

export type UserSchemaType = yup.InferType<typeof userSchema>;
export default userSchema;
