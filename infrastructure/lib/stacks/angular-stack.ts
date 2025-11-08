import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { AngularConstruct } from "../constructs/angular-construct";

export class AngularStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new AngularConstruct(this, "demo-deployment", {
      buildConfiguration: "production",
      relativeAngularPath: "./client/streamio",
    });
  }
}