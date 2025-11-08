import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import * as eventsources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as apigatewayv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as lambdaAuthorizers from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import path = require('path');


interface NotificationStackProps extends cdk.StackProps {
    api: apigatewayv2.HttpApi;
    httpAuthorizer: lambdaAuthorizers.HttpLambdaAuthorizer;
    metadata: dynamodb.TableV2;
    subscriptions: dynamodb.TableV2;
}

export class NotificationStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: NotificationStackProps) {
        super(scope, id, props);

        const streamProcessor = new lambda.Function(this, 'StreamProcessor', {
            runtime: lambda.Runtime.PYTHON_3_9,
            handler: 'notification_processor.handler',
            code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda/event-invoked')),
            environment: {
                METADATA_TABLE: props.metadata.tableName
            }
        });

        props.metadata.grantStreamRead(streamProcessor);

        streamProcessor.addEventSource(new eventsources.DynamoEventSource(props.metadata, {
            startingPosition: lambda.StartingPosition.TRIM_HORIZON,
            batchSize: 5,
            bisectBatchOnError: true,
            retryAttempts: 10
        }));

        const snsListAndPublishTopicsPolicy = new iam.PolicyStatement({
            actions: [
                'sns:ListTopics',
                'sns:CreateTopic',
                'sns:Publish',
            ],
            resources: ['*']
        });

        streamProcessor.addToRolePolicy(snsListAndPublishTopicsPolicy);

        const subProcessor = new lambda.Function(this, 'SubProcessor', {
            runtime: lambda.Runtime.PYTHON_3_9,
            handler: 'subscription_processor.handler',
            code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda/event-invoked')),
            environment: {
                SUBSCRIPTIONS_TABLE: props.subscriptions.tableName,
                REGION: this.region,
                ACCOUNT_ID: this.account
            }
        });

        props.metadata.grantStreamRead(subProcessor);

        subProcessor.addEventSource(new eventsources.DynamoEventSource(props.subscriptions, {
            startingPosition: lambda.StartingPosition.TRIM_HORIZON,
            batchSize: 5,
            bisectBatchOnError: true,
            retryAttempts: 10
        }));

        const snsSubUnsubTopicsPolicy = new iam.PolicyStatement({
            actions: [
                'sns:Subscribe',
                'sns:Unsubscribe',
                'sns:ListTopics',
                'sns:ListSubscriptionsByTopic'
            ],
            resources: ['*']
        });

        subProcessor.addToRolePolicy(snsSubUnsubTopicsPolicy);

        const postSubscription = new lambda.Function(this, 'PostSubscriptionLambda', {
            runtime: lambda.Runtime.PYTHON_3_9,
            handler: 'post_subscription.handler',
            code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda/subscription-endpoints')),
            environment: {
                SUBSCRIPTIONS_TABLE: props.subscriptions.tableName
            }
        });

        props.subscriptions.grantWriteData(postSubscription);

        const postMovieIntegration = new HttpLambdaIntegration(
            "PostSubscription",
            postSubscription
        );
        props.api.addRoutes({
            path: "/post-subscription",
            methods: [apigatewayv2.HttpMethod.POST],
            integration: postMovieIntegration,
            authorizer: props.httpAuthorizer,
        });

        const putSubscription = new lambda.Function(this, 'PutSubscriptionLambda', {
            runtime: lambda.Runtime.PYTHON_3_9,
            handler: 'put_subscription.handler',
            code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda/subscription-endpoints')),
            environment: {
                SUBSCRIPTIONS_TABLE: props.subscriptions.tableName
            }
        });

        props.subscriptions.grantWriteData(putSubscription);

        const putMovieIntegration = new HttpLambdaIntegration(
            "PutSubscription",
            putSubscription
        );
        props.api.addRoutes({
            path: "/put-subscription",
            methods: [apigatewayv2.HttpMethod.PUT],
            integration: putMovieIntegration,
            authorizer: props.httpAuthorizer,
        });

        const getSubscription = new lambda.Function(this, 'GetSubscriptionLambda', {
            runtime: lambda.Runtime.PYTHON_3_9,
            handler: 'get_subscription.handler',
            code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda/subscription-endpoints')),
            environment: {
                SUBSCRIPTIONS_TABLE: props.subscriptions.tableName
            }
        });

        props.subscriptions.grantReadData(getSubscription);

        const getMovieIntegration = new HttpLambdaIntegration(
            "GetSubscription",
            getSubscription
        );
        props.api.addRoutes({
            path: "/get-subscription",
            methods: [apigatewayv2.HttpMethod.GET],
            integration: getMovieIntegration,
            authorizer: props.httpAuthorizer,
        });

        const getTopics = new lambda.Function(this, 'GetTopicsLambda', {
            runtime: lambda.Runtime.PYTHON_3_9,
            handler: 'get_topics.handler',
            code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda/subscription-endpoints'))
        });

        const getTopicsIntegration = new HttpLambdaIntegration(
            "GetTopics",
            getTopics
        );
        props.api.addRoutes({
            path: "/get-topics",
            methods: [apigatewayv2.HttpMethod.GET],
            integration: getTopicsIntegration,
            authorizer: props.httpAuthorizer,
        });

        const snsListTopicsPolicy = new iam.PolicyStatement({
            actions: [
                'sns:ListTopics',
            ],
            resources: ['*']
        });

        getTopics.addToRolePolicy(snsListTopicsPolicy);

    }
}

