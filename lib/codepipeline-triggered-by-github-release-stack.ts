import { CfnOutput, Stack, StackProps, SecretValue } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as codeBuild from 'aws-cdk-lib/aws-codebuild';
import * as codePipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codePipelineActions from 'aws-cdk-lib/aws-codepipeline-actions';

export interface CodepipelineTriggeredByGithubReleaseStackProps
  extends StackProps {
  projectName: string;
  githubOwnerName: string;
  githubRepositoryName: string;
  githubBranchName: string;
  githubWebhookSecretTokenName: string;
  codestarConnectionArn: string;
}

export class CodepipelineTriggeredByGithubReleaseStack extends Stack {
  constructor(
    scope: Construct,
    id: string,
    props: CodepipelineTriggeredByGithubReleaseStackProps
  ) {
    super(scope, id, props);

    const {
      projectName,
      githubOwnerName,
      githubRepositoryName,
      githubBranchName,
      githubWebhookSecretTokenName,
      codestarConnectionArn,
    } = props;

    const webhookSecretToken = SecretValue.secretsManager(
      githubWebhookSecretTokenName
    ).unsafeUnwrap();

    const sourceArtifact = new codePipeline.Artifact();
    const sourceAction =
      new codePipelineActions.CodeStarConnectionsSourceAction({
        actionName: 'source',
        owner: githubOwnerName,
        repo: githubRepositoryName,
        branch: githubBranchName,
        connectionArn: codestarConnectionArn,
        output: sourceArtifact,
        // Push では起動させない
        triggerOnPush: false,
      });

    const codeBuildDeployProject = new codeBuild.PipelineProject(
      this,
      'CodeBuildDeployProject',
      {
        projectName: `${projectName}-deploy-project`,
        buildSpec: codeBuild.BuildSpec.fromSourceFilename('./buildspec.yml'),
      }
    );

    const deployAction = new codePipelineActions.CodeBuildAction({
      actionName: 'deploy',
      project: codeBuildDeployProject,
      input: sourceArtifact,
    });

    const deployPipeline = new codePipeline.Pipeline(this, 'DeployPipeline', {
      pipelineName: `${projectName}-deploy-pipeline`,
      stages: [
        {
          stageName: 'source',
          actions: [sourceAction],
        },
        {
          stageName: 'deploy',
          actions: [deployAction],
        },
      ],
    });

    const webhook = new codePipeline.CfnWebhook(this, 'WebhookResource', {
      authentication: 'GITHUB_HMAC',
      authenticationConfiguration: {
        secretToken: webhookSecretToken,
      },
      // GitHub でリリースされたことをトリガーとする
      filters: [
        {
          jsonPath: '$.action',
          matchEquals: 'published',
        },
      ],
      targetAction: sourceAction.actionProperties.actionName,
      targetPipeline: deployPipeline.pipelineName,
      targetPipelineVersion: 1,
      registerWithThirdParty: false,
      // GitHub 側で Webhook を手動で作成する
    });

    new CfnOutput(this, 'WebhookUrl', {
      value: webhook.attrUrl,
    });
  }
}
