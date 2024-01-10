import express from "express";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import StudentUser from "../models/Student.model.js";
import jwt from "jsonwebtoken";
import { v4 as uuid } from "uuid";
import axios from "axios";
import { getFutureDate, getCurrentDate } from "../utils/utils.js";

import Role from "../models/Role.model.js";
const router = express.Router();
dotenv.config();

const AUTH_KEY = process.env.AUTH_KEY;

export const getSingleData = async (req, res) => {
  try {
    const id = req.query.id;
    const singleUser = await StudentUser.findOne(
      {
        _id: id,
        userType: "student",
      },
      { password: 0 }
    );
    res.status(200).json(singleUser);
    console.log(`${singleUser.userType} Called Succesfully with id: ${id}`);
  } catch (error) {
    console.log(`Error Fetching User ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

export const getData = async (req, res) => {
  try {
    const getUsers = await StudentUser.find(
      { userType: "student" },
      {
        attemptedTests: 0,
        password: 0,
        permissions: 0,
      }
    );
    let users = getUsers
      .map((user) => user.toObject())
      .map((modUser) => {
        let newUser = modUser;
        newUser.id = modUser._id;
        delete newUser._id;
        return newUser;
      });
    res.status(200).json(users);
    console.log(
      `${getUsers.userType} Modified Successfully with id: ${users.id}`
    );
  } catch (error) {
    console.log(`Error Modifing Data ${error.message}`);
    res.status(404).json({ message: error.message });
  }
};

export const createUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const newUser = await StudentUser.findOne({ email });

    if (newUser?._doc) {
      console.log(`Student email ${email} already exists`);
      return res.status(400).json({ message: "Student User already exists" });
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    let finalData = req.body;
    finalData.attemptedTests = [];

    finalData.contact = finalData.contact;

    const result = await StudentUser.create({
      ...finalData,
      _id: `IITP_ST_${uuid().replace(/-/g, "_")}`,
      password: hashedPassword,
    });

    const roles = req.body.roles;

    console.log(`Student User created Successfully with id: ${result._id}`);
    return res
      .status(200)
      .json({ result, message: "Student User created successfully" });
  } catch (error) {
    console.log(`Error Creating Data ${error.message}`);
    res.status(404).json({ message: error.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await StudentUser.findOne({ _id: id });
    if (!user) {
      console.log(`User not Found with id: ${id}`);
      return res.status(404).send(`No user with id: ${id}`);
    }

    await StudentUser.findByIdAndRemove(id);
    res.json({ message: "User deleted successfully." });
    console.log(`User Deleted Successfully with id: ${id}`);
  } catch (error) {
    console.log(`Error Deleting User ${error.message}`);
    res.status(404).json({ message: error.message });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    await StudentUser.findByIdAndUpdate(id, req.body, { new: true });
    console.log(`User Updated Succesfully with id: ${id}`);
    res.json(updateUser);
  } catch (error) {
    console.log(`Updating User with id: ${id} Failed`);
    res.status(404).status({ message: error.message });
  }
};

export const createStudent = async (req, res) => {
  try {
    const { email, password, contact } = req.body;
    const promises = [
      StudentUser.findOne({ email }),
      StudentUser.findOne({ contact }),
    ];
    const [existingEmail, existingContact] = await Promise.all(promises);

    if (existingEmail) {
      console.log(`Student email: ${email} already exists`);
      return res
        .status(400)
        .json({ message: "Student User already exists with this email" });
    }
    if (existingContact) {
      console.log(`Student contact: ${contact} already Exists`);
      return res
        .status(400)
        .json({ message: "Student User already exists with this contact" });
    }

    try {
      const hashedPassword = await bcrypt.hash(password, 12);
      let finalData = req.body;
      finalData.validity = {
        from: getCurrentDate(),
        to: getFutureDate(400),
      };
      finalData.password = hashedPassword;
      const result = await StudentUser.create({
        ...finalData,
        _id: `IITP_ST_${uuid().replace(/-/g, "_")}`,
        pasword: hashedPassword,
      });

      const resss = await axios.post(
        `${process.env.USERS_API_URI}/roles/addMember`,
        {
          id: result._id,
          name: result.name,
        },
        {
          params: {
            roleId: "ROLE_STUDENT",
          },
          headers: {
            authorization: req?.headers?.authorization,
          },
        }
      );
      console.log(`Student User created with id: ${result._id}`);
      return res.status(200).json({ result, message: "student user created" });
    } catch (err) {
      console.log(`Error Creating User ${err}`);
      return res.status(500).json({ message: err.message });
    }
  } catch (error) {
    console.log(`Create User TRy Block Error: ${error}`);
    return res.status(404).json({ message: error.message });
  }
};

export default router;
