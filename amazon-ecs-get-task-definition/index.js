const core = require('@actions/core');
const aws = require('aws-sdk');
const tmp = require('tmp');
const fs = require('fs');

async function run() {
  try {
    const ecs = new aws.ECS({
      customUserAgent: 'amazon-ecs-get-task-definition-for-github-actions'
    });

    // Get inputs
    const family = core.getInput('family', { required: true });
    let revision = core.getInput('revision', { required: false });

    const params = {
      taskDefinition: `${family}:${revision ? revision : 'ACTIVE'}`,
    };
    
    let describeResponse;
    try {
      describeResponse = await ecs.describeTaskDefinition(params).promise();
    } catch (error) {
      core.setFailed("Failed to describe task definition in ECS: " + error.message);
      core.debug("Family:");
      core.debug(params.taskDefinition);
      throw(error);
    }

    // Write out a new task definition file
    var updatedTaskDefFile = tmp.fileSync({
      dir: process.env.RUNNER_TEMP,
      prefix: 'task-definition-',
      postfix: '.json',
      keep: true,
      discardDescriptor: true
    });
    const newTaskDefContents = JSON.stringify(describeResponse.taskDefinition.containerDefinitions, null, 2);
    fs.writeFileSync(updatedTaskDefFile.name, newTaskDefContents);
    core.setOutput('task-definition', updatedTaskDefFile.name);
  }
  catch (error) {
    core.setFailed(error.message);
    core.debug(error.stack);
  }
}

module.exports = run;

/* istanbul ignore next */
if (require.main === module) {
    run();
}
