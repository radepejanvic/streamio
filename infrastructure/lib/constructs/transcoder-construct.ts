import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';
import * as path from 'path';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';


interface TranscoderProps {
    bucket: s3.IBucket;
    queue: sqs.IQueue;
}

export class Transcoder extends Construct {
    constructor(scope: Construct, id: string, props: TranscoderProps) {
        super(scope, id);

        const ffmpeg = new lambda.LayerVersion(this, 'FFMPEG-Layer', {
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            code: lambda.Code.fromAsset(path.join(__dirname, '../../layer-assets', 'ffmpeg.zip')),
            compatibleArchitectures: [lambda.Architecture.ARM_64],
            description: 'FFMPEG static binary for ARM64 architecture.',
        });

        const transcode = new lambda.Function(this, 'TranscodeLambda', {
            runtime: lambda.Runtime.PYTHON_3_9,
            handler: 'transcode.handler',
            code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda')),
            timeout: cdk.Duration.seconds(300),
            architecture: lambda.Architecture.ARM_64,
            environment: {
                BUCKET_NAME: props.bucket.bucketName,
                QUEUE_URL: props.queue.queueUrl,
                PATH: 'bin'
            },
            layers: [ffmpeg]
        });

        props.bucket.grantRead(transcode);
        props.bucket.grantPut(transcode);

        const job1 = new tasks.LambdaInvoke(this, 'TranscoderJob1', {
            lambdaFunction: transcode,
            timeout: cdk.Duration.seconds(10),
            // inputPath: ''
        })

        const job2 = new tasks.LambdaInvoke(this, 'TranscoderJob2', {
            lambdaFunction: transcode,
            timeout: cdk.Duration.seconds(10),
            // resultPath: '$.transcodeJob',
        })

        const definition = new sfn.Parallel(this, 'ParallelTranscoding')
            .branch(job1)
            .branch(job2);

        const stateMachine = new sfn.StateMachine(this, 'TranscoderStateMachine', {
            definition: definition,
            timeout: cdk.Duration.minutes(5),
        })

        transcode.grantInvoke(stateMachine);

        const trigger = new lambda.Function(this, 'TranscoderTriggerLambda', {
            runtime: lambda.Runtime.PYTHON_3_9,
            handler: 'transcoder_trigger.handler',
            code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda')),
            environment: {
                QUEUE_URL: props.queue.queueUrl,
                STATE_MACHINE_ARN: stateMachine.stateMachineArn,
            }
        });

        trigger.addEventSource(new SqsEventSource(props.queue, {
            batchSize: 1,
        }));

        stateMachine.grantStartExecution(trigger);
        props.queue.grantConsumeMessages(trigger);
    }
}