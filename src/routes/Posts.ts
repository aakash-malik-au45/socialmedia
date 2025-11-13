import express from "express";
import Post from "../models/Post";
import jwt from "jsonwebtoken";
import { Types } from "mongoose";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "devsecret";

function authMiddleware(req: any, res: any, next: any) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: "Missing auth" });
  const m = auth.match(/^Bearer (.+)$/);
  if (!m) return res.status(401).json({ error: "Invalid auth" });
  try {
    const payload: any = jwt.verify(m[1], JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// GET posts (public)
router.get("/", async (_, res) => {
  const posts = await Post.find().sort({ createdAt: -1 }).lean();
  res.json(posts);
});

// Create starting number (auth)
router.post("/", authMiddleware, async (req: any, res) => {
  const { startNumber } = req.body;
  if (typeof startNumber !== "number") return res.status(400).json({ error: "startNumber must be number" });

  const post = await Post.create({
    authorId: req.user.id,
    startNumber,
    nodes: [
      {
        parentId: null,
        op: null,
        rightOperand: null,
        result: startNumber,
        authorId: req.user.id,
        createdAt: new Date()
      }
    ]
  });
  res.json(post);
});

// Add operation node
router.post("/:postId/nodes", authMiddleware, async (req: any, res) => {
  const { postId } = req.params;
  const { parentIndex, op, rightOperand } = req.body;
  // parentIndex: index into post.nodes array (we use index for simplicity)
  if (!["add", "sub", "mul", "div"].includes(op)) return res.status(400).json({ error: "invalid op" });
  if (typeof rightOperand !== "number") return res.status(400).json({ error: "rightOperand must be number" });

  const post = await Post.findById(postId);
  if (!post) return res.status(404).json({ error: "post not found" });

  const parentNode = post.nodes[parentIndex];
  if (!parentNode) return res.status(400).json({ error: "parent node not found" });

  const a = parentNode.result;
  const b = rightOperand;
  let result: number;
  if (op === "add") result = a + b;
  else if (op === "sub") result = a - b;
  else if (op === "mul") result = a * b;
  else {
    if (b === 0) return res.status(400).json({ error: "division by zero" });
    result = a / b;
  }

  post.nodes.push({
    parentId: parentNode._id,
    op,
    rightOperand: b,
    result,
    authorId: req.user.id,
    createdAt: new Date()
  });

  await post.save();
  res.json(post);
});

export default router;
