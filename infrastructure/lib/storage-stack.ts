import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';

export class StorageStack extends cdk.Stack {

    public readonly bucket: s3.Bucket;

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        this.bucket = new s3.Bucket(this, 'MoviesBucket', {
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            bucketName: "streamio-movies-bucket",
            versioned: true,
            cors: [
                {
                  allowedOrigins: ['*'], 
                  allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.POST, s3.HttpMethods.DELETE], 
                  allowedHeaders: ['*'], 
                  maxAge: 3000, 
                }
              ]
        });

    }
}
