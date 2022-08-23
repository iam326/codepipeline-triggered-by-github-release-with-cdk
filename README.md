# codepipeline-triggered-by-github-release-with-cdk

【AWS CDK】GitHub の Release をトリガーに CodePipeline を起動する

## 事前準備

SecretsManager に GitHub の Webhook 用シークレットトークンを手動で格納する

## Deploy

```
$ cdk deploy codepipeline-triggered-by-github-release-cicd
```

上記のデプロイが完了した後、GitHub の Webhook を手動で作成する

## 参考

- [GitHub の push 以外の WebHook イベントから CodePipeline を発火させる](https://qiita.com/techneconn/items/cff3e76301006f42c78f)
- [AWS Pipelines with Github Release trigger in CDK](https://blog.cuckoo.org/aws-pipelines-with-github-release-trigger-in-cdk)
