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
    const image = core.getInput('image', { required: true });
    const containerName = core.getInput('container-name', { required: true });
    let revision = core.getInput('revision', { required: false });

    const params = {
      taskDefinition: `${family}${revision ? `:${revision}` : ''}`,
    };
    
    let describeResponse;
    try {
      describeResponse = await ecs.describeTaskDefinition(params).promise();
    } catch (error) {
      core.setFailed("Failed to describe task definition in ECS: " + error.message);
      core.debug("Family:");
      core.debug(params.taskDefinition, family, revision);
      throw(error);
    }

    core.debug("Response:");
    core.debug(describeResponse);
    const containerDef = describeResponse.taskDefinition.containerDefinitions.find(function(element) {
      return element.name == containerName;
    });

    containerDef.image = image;

    // Write out a new task definition file
    var updatedTaskDefFile = tmp.fileSync({
      dir: process.env.RUNNER_TEMP,
      prefix: 'task-definition-',
      postfix: '.json',
      keep: true,
      discardDescriptor: true
    });
    const newTaskDef = {
      family,
      // For some reason describing the task definition does not include networkMode
      // even though documentation suggests it should, and the task definition has
      // it defined. Anyways, we need to push this here, although it feels weird
      // here..
      networkMode: 'awsvpc',
      containerDefinitions: describeResponse.taskDefinition.containerDefinitions,
    }
    const newTaskDefContents = JSON.stringify(newTaskDef, null, 2);
    core.debug("Task Definition:");
    core.debug(newTaskDef);
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
