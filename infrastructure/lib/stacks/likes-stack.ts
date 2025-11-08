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


interface LikesStackProps extends cdk.StackProps {
    api: apigatewayv2.HttpApi;
    httpAuthorizer: lambdaAuthorizers.HttpLambdaAuthorizer;
    likes: dynamodb.TableV2;
}

export class LikesStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: LikesStackProps) {
        super(scope, id, props);

        const postLike = new lambda.Function(this, 'PostLikeLambda', {
            runtime: lambda.Runtime.PYTHON_3_9,
            handler: 'post_like.handler',
            code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda/likes-endpoints')),
            environment: {
                LIKES_TABLE: props.likes.tableName
            }
        });

        props.likes.grantWriteData(postLike);

        const postLikeIntegration = new HttpLambdaIntegration(
            "PostLike",
            postLike
        );
        props.api.addRoutes({
            path: "/post-like",
            methods: [apigatewayv2.HttpMethod.POST],
            integration: postLikeIntegration,
            authorizer: props.httpAuthorizer,
        });

        const getLike = new lambda.Function(this, 'GetLikeLambda', {
            runtime: lambda.Runtime.PYTHON_3_9,
            handler: 'get_like.handler',
            code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda/likes-endpoints')),
            environment: {
                LIKES_TABLE: props.likes.tableName
            }
        });

        props.likes.grantReadData(getLike);

        const getLikeIntegration = new HttpLambdaIntegration(
            "GetLike",
            getLike
        );
        props.api.addRoutes({
            path: "/get-like",
            methods: [apigatewayv2.HttpMethod.GET],
            integration: getLikeIntegration,
            authorizer: props.httpAuthorizer,
        });

        const deleteLike = new lambda.Function(this, 'DeleteLikeLambda', {
            runtime: lambda.Runtime.PYTHON_3_9,
            handler: 'delete_like.handler',
            code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda/likes-endpoints')),
            environment: {
                LIKES_TABLE: props.likes.tableName
            }
        });

        props.likes.grantWriteData(deleteLike);

        const deleteLikeIntegration = new HttpLambdaIntegration(
            "DeleteLike",
            deleteLike
        );
        props.api.addRoutes({
            path: "/delete-like",
            methods: [apigatewayv2.HttpMethod.DELETE],
            integration: deleteLikeIntegration,
            authorizer: props.httpAuthorizer,
        });

    }
}

