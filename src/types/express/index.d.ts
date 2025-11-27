import "express";
import { Server } from "http";

declare module "express-serve-static-core" {
  interface Express {
    server?: Server;
  }
}
