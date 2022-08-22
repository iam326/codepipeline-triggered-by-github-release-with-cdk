#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CodepipelineTriggeredByGithubReleaseStack } from '../lib/codepipeline-triggered-by-github-release-stack';

const app = new cdk.App();

const projectName = app.node.tryGetContext('projectName');
const githubOwnerName = app.node.tryGetContext('githubOwnerName');
const githubRepositoryName = app.node.tryGetContext('githubRepositoryName');
const githubBranchName = app.node.tryGetContext('githubBranchName');
const githubTokenName = app.node.tryGetContext('githubTokenName');
const webhookSecretTokenName = app.node.tryGetContext('webhookSecretTokenName');

new CodepipelineTriggeredByGithubReleaseStack(app, `${projectName}-cicd`, {
  projectName,
  githubOwnerName,
  githubRepositoryName,
  githubBranchName,
  githubTokenName,
  webhookSecretTokenName,
});
