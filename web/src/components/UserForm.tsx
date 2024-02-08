"use client";
import React, { ChangeEvent, useEffect, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import userSchema from "../validations/userSchema";
import { UserSchemaType } from "../validations/userSchema";
import { yupResolver } from "@hookform/resolvers/yup";
const UserForm = () => {
  const [hobbies, setHobbies] = useState<Array<string>>([]);
  const {
    setValue,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UserSchemaType>({ resolver: yupResolver(userSchema) });
  console.log(errors);
  const onSubmit = (data: UserSchemaType) => {
    console.log(data);
  };

  const handleHobbies = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setHobbies((previousData) => {
        return [...previousData, e.target.value];
      });
    } else {
      setHobbies((previousData) => {
        const filteredData = previousData.filter((d) => d != e.target.value);
        return filteredData;
      });
    }
  };

  const handleProfile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target?.files?.[0];
    if (file) {
      setValue("profile", file);
    }
  };

  useEffect(() => {
    setValue("hobbies", hobbies);
  }, [hobbies]);

  return (
    <div className=" ">
      <h4 className=" text-center mt-11 text-3xl font-semibold text-red-800">
        User Form
      </h4>
      <div className="flex justify-center mt-4 ">
        <form
          action=""
          onSubmit={handleSubmit(onSubmit)}
          className="border border-violet-900 border-2 ps-3 p-11 pt-6 w-screen sm:w-2/5"
        >
          <div className="flex flex-col w-90">
            <label htmlFor="name">Name :</label>
            <input
              type="text"
              className="border border-black py-1"
              id="name"
              {...register("name")}
            />
            <span className="sm:text-xs text-red-600">
              {errors.name?.message}
            </span>
          </div>
          <div className="flex flex-col w-90 mt-4">
            <label htmlFor="email">Email :</label>
            <input
              type="text"
              className="border border-black py-1"
              id="email"
              {...register("email")}
            />
            <span className="sm:text-xs text-red-600">
              {errors.email?.message}
            </span>
          </div>{" "}
          <div className="flex flex-col w-90 mt-4">
            <label>Hobbies :</label>
            <div className="flex justify-between ms-4 mt-2">
              <div className="flex ">
                <input
                  onChange={handleHobbies}
                  type="checkbox"
                  name="football"
                  id="football"
                  value="football"
                />
                <label htmlFor="footbal " className="ms-1 text-sm">
                  football
                </label>
              </div>
              <div className="flex">
                <input
                  onChange={handleHobbies}
                  type="checkbox"
                  name="basketball"
                  id="basketball"
                  value="basketball"
                />

                <label htmlFor="basketball" className="ms-1 text-sm">
                  basketball
                </label>
              </div>
              <div className="flex">
                <input
                  type="checkbox"
                  onChange={handleHobbies}
                  name="volleyball"
                  value="volleyball"
                  id="volleyball"
                />
                <label htmlFor="volleyball" className="ms-1 text-sm">
                  volleyball
                </label>
              </div>
            </div>

            <span className="sm:text-xs text-red-600">
              {" "}
              {errors.hobbies?.message}
            </span>
          </div>{" "}
          <div className="flex flex-col w-90 mt-4">
            <label htmlFor="profile">Profile Picture :</label>
            <input
              type="file"
              className=" py-1"
              name="profile"
              id="profile"
              onChange={handleProfile}
            />
            <span className="sm:text-xs text-red-600">
              {" "}
              {errors.profile?.message}
            </span>
          </div>{" "}
          <div className="flex justify-center mt-6">
            <button className=" hover:bg-teal-800 rounded-lg transistion duration-500 ease-in-out px-5 py-2 bg-teal-600 text-white">
              submit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default UserForm;
