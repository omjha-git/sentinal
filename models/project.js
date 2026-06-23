const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema(
  {
    id: String,
    name: String,
    type: {
      type: String,
      enum: ["file", "folder"],
      required: true,
    },
    content: {
      type: String,
      default: "",
    },
    open: {
      type: Boolean,
      default: true,
    },
    children: {
      type: Array,
      default: [],
    },
  },
  { _id: false }
);

const projectSchema = new mongoose.Schema(
  {
    clerkId: {
      type: String,
      required: true,
    },

    title: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      default: "",
    },

    repoUrl: {
      type: String,
      default: "",
    },

    files: {
      type: [fileSchema],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Project", projectSchema);