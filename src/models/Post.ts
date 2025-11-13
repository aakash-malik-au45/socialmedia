import mongoose, { Document, Schema } from "mongoose";

export type Op = "add" | "sub" | "mul" | "div";

export interface INode {
  _id?: mongoose.Types.ObjectId;
  parentId: mongoose.Types.ObjectId | null;
  op: Op | null;
  rightOperand: number | null;
  result: number;
  authorId: string;
  createdAt: Date;
}

const NodeSchema = new Schema<INode>(
  {
    parentId: { type: Schema.Types.ObjectId, ref: "Node", default: null },
    op: { type: String, enum: ["add", "sub", "mul", "div", null], default: null },
    rightOperand: { type: Number, default: null },
    result: { type: Number, required: true },
    authorId: { type: String, required: true },
    createdAt: { type: Date, default: () => new Date() },
  },
  { _id: true } // ensures each node gets an ObjectId
);

export interface IPost extends Document {
  authorId: string;
  startNumber: number;
  createdAt: Date;
  nodes: INode[];
}

const PostSchema = new Schema<IPost>({
  authorId: { type: String, required: true },
  startNumber: { type: Number, required: true },
  createdAt: { type: Date, default: () => new Date() },
  // ✅ fix: use array of subdocuments directly, not "type: [NodeSchema]"
  nodes: { type: [NodeSchema] as unknown as INode[], default: [] },
});

export default mongoose.model<IPost>("Post", PostSchema);
