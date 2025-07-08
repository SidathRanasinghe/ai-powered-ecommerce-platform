declare module "express-slow-down" {
  import { RequestHandler } from "express";
  interface Options {
    windowMs?: number;
    delayAfter?: number;
    delayMs?: number;
    maxDelayMs?: number;
    skipFailedRequests?: boolean;
    skipSuccessfulRequests?: boolean;
    keyGenerator?: (req: any, res: any) => string;
    skip?: (req: any, res: any) => boolean;
    onLimitReached?: (req: any, res: any, optionsUsed: Options) => void;
    requestWasSuccessful?: (req: any, res: any) => boolean;
    store?: any;
  }
  function slowDown(options?: Options): RequestHandler;
  export = slowDown;
}
