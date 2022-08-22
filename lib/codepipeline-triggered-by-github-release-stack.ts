import { Stack, StackProps, SecretValue } from 'aws-cdk-lib';
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
  githubTokenName: string;
  webhookSecretTokenName: string;
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
      githubTokenName,
      webhookSecretTokenName,
    } = props;

    // 2022年から SecretManager の値を使用する際に unsafeUnwrap() する必要があるようになった
    // https://stackoverflow.com/questions/67604825/pass-aws-sm-secret-key-to-lambda-environment-with-cdk#answer-72565446
    const githubToken =
      SecretValue.secretsManager(githubTokenName).unsafeUnwrap();
    const webhookSecretToken = SecretValue.secretsManager(
      webhookSecretTokenName
    ).unsafeUnwrap();

    const sourceArtifact = new codePipeline.Artifact();

    const codeBuildDeployProject = new codeBuild.PipelineProject(
      this,
      'CodeBuildDeployProject',
      {
        projectName: `${projectName}-deploy-project`,
        buildSpec: codeBuild.BuildSpec.fromSourceFilename('./buildspec.yml'),
      }
    );

    const sourceAction = new codePipelineActions.GitHubSourceAction({
      actionName: 'source',
      owner: githubOwnerName,
      repo: githubRepositoryName,
      branch: githubBranchName,
      oauthToken: new SecretValue(githubToken),
      output: sourceArtifact,
      // デフォルトのトリガーを外す
      trigger: codePipelineActions.GitHubTrigger.NONE,
    });

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

    new codePipeline.CfnWebhook(this, 'WebhookResource', {
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
      registerWithThirdParty: true,
    });
  }
}
