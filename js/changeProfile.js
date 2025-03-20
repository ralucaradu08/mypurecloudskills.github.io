/**
 * FUNCTIONS IN THIS FILE REQUIRE:
 * 1. architectApiInstance
 * 2. routingApiInstance
 * 3. userApiInstance
 */

import { updateDropDownHtml } from "./dropDownProfileUpdate.js";

// Retrieve and apply the giver profile to the given user
// (And all the api instances)
export async function applyProfileToUser(profile, userId, architectApiInstance, routingApiInstance, userApiInstance) {
    if (typeof userId == undefined) {
        console.log("UserId not retrieved (is undefined). Cannot set profile");
        return;
    }
    profile = profile.toUpperCase();
    let skills = [];
    let profficiencies = [];
    let applyProfileUser = true; // do not apply an empty profile in the self-scope selection

    let datatableId;
    // Retrieve the datatable id
    try {
        let opts = {
            "name": "A_PROFILES_AGENTS_ALLOCATION" // The name of the databable with the profiles
        };
        let data = await architectApiInstance.getFlowsDatatables(opts);
        datatableId = data.entities[0].id;
    } catch (error) {
        console.log("There was a failure calling getFlowsDatatables. Could not retrieve datatableId.");
        console.error(error);
        alert("Error while retrieving GCloud Datatable A_PROFILES_AGENTS_ALLOCATION!");
        return;
    }

    let agentRow;
    //Retrieve skills and proficiencies for the given profile
    //IMPORTANT: Sets profficiencies to a string array of 'numbers', so they still need to be converted upon use
    try {
        let opts = { 
            'showbrief': false // Boolean | if true returns just the key field for the row
        };
        agentRow = await architectApiInstance.getFlowsDatatableRow(datatableId, userId, opts);
    } catch (error) {
        console.log('There was a failure calling getFlowsDatatableRow. Could not retrieve datatable row.');
        console.error(error);
        profile='NA';
        $.getScript("js/sweetalert2.all.js",function(){
            Swal.fire({
              title: 'Skills Allocation is NOT Defined for Your User!',
              text: 'Please contact your supervisor about this!',
              icon: 'error',
              toast: '',
              timer: 5000
            });
          });
        return;
    }

    // Parse skills from the datatable row for the given profile
    switch (profile) {
        case "PRIMARY":
            skills = agentRow.PRIMARY_SKILLS.split("|");
            profficiencies = agentRow.PRIMARY_VALUES.split("|");
            if ((agentRow.PRIMARY_SKILLS == undefined) || (agentRow.PRIMARY_SKILLS.trim() == ""))
                {
                    applyProfileUser = false;
                }
            break;
        case "BACKUP":
            skills = agentRow.BACKUP_SKILLS.split("|");
            profficiencies = agentRow.BACKUP_VALUES.split("|");
            if ((agentRow.BACKUP_SKILLS == undefined) || (agentRow.BACKUP_SKILLS.trim() == ""))
                {
                    applyProfileUser = false;
                }
            break;
        case "DEFAULT":
            skills = agentRow.DEFAULT_SKILLS.split("|");
            profficiencies = agentRow.DEFAULT_VALUES.split("|");
            if ((agentRow.DEFAULT_SKILLS == undefined) || (agentRow.DEFAULT_SKILLS.trim() == ""))
            {
                applyProfileUser = false;
            }
            break;
        case "EMERGENCY":
            skills = agentRow.EMERGENCY_SKILLS.split("|");
            profficiencies = agentRow.EMERGENCY_VALUES.split("|");
            if ((agentRow.EMERGENCY_SKILLS == undefined) || (agentRow.EMERGENCY_SKILLS.trim() == ""))
            {
                applyProfileUser = false;
            }
            break;
        default:
            console.log("Unknown profile");
            applyProfileUser = false;
            return;
            //break;
    }
    
    
    if (applyProfileUser == true){
            agentRow.PROFILE_ACTIVE = profile; // Apply the current profile in memory

            // Update the active profile in Genesys
            try {
                let newRow = {
                    'body': agentRow
                };
                await architectApiInstance.putFlowsDatatableRow(datatableId, userId, newRow);
            } catch (error) {
                console.log("There was a failure calling putFlowsDatatableRow. Could not update active profile.");
                console.error(error);
                profile = 'NA'; 
                return;
            }
            
            await changeSkills(skills, profficiencies, userId, routingApiInstance, userApiInstance);
             // done, limitted to 50 skills


            updateDropDownHtml(profile);
            if ((document.getElementById("profileDisplay")!=undefined) && (document.getElementById("profileDisplay")!=null)){
                document.getElementById("profileDisplay").innerHTML = `Your current profile is: ${profile.toUpperCase()}`;
            }
        } else {
            updateDropDownHtml(agentRow.PROFILE_ACTIVE);
            $.getScript("js/sweetalert2.all.js",function(){
                Swal.fire({
                  title: 'Warning!',
                  text: 'You cannot apply an empty Profile to yourself! This would delete all your skills! Could not update profile.',
                  icon: 'warning',
                  toast: '',
                  timer: 5000
                });
              });
        }
  
}

// Changes the skills of the the given userId with given skills and corresponding profficiencies
// Assumes that skills and corresponding profficiencies match indecies in their respective arrays
// Assumes that skills have a UNIQUE name
async function changeSkills(listOfSkills, listOfProfficiencies, userId, routingApiInstance, userApiInstance) {
    
    let skillObjects = []; // List of skill Objects to be applied to the user in Genesys
    // Get skillId for each skill and add it to the list of skills
    for (let index = 0; index < listOfSkills.length; index++) {
        if ( (listOfSkills[index]=== undefined) || (listOfSkills[index].trim() == "") ){
            continue;
        };
        let opts = {
            "name": listOfSkills[index] //IMPORTANT: This assumes that skills have a UNIQUE name
        }

        // Get the skillId for that skill name given in opts
        try {
            let data = await routingApiInstance.getRoutingSkills(opts);
            // Add the current skill to the list of objects to be added to the user profile
             // RRA: This will get the skills starting with the Skill Name searched, we need the exact match
            let llen = data.entities.length;
            loop20: 
            for (let i=0; i<llen; i++){
                if (data.entities[i].name.toUpperCase() == listOfSkills[index].toUpperCase()){
                    skillObjects.push(
                        {
                            "id": data.entities[i].id,
                            "proficiency": parseFloat(listOfProfficiencies[index]) // IMPORTANT: This assumes that skills and profficiencies have the same index
                        }
                    );
                    break loop20;
                } else {
                    continue;
                }
            }
        } catch (error) {
            console.log("There was a failure calling getRoutingSkills. Could not retrieve skill info.");
            console.error(error);
        }
    }

    // Replace the routing skills associated with the given user with the new list of skills
    try {
        await userApiInstance.putUserRoutingskillsBulk(userId, skillObjects);
    } catch (error) {
        console.log("There was a failure calling putUserRoutingskillsBulk. Could not update profile.");
        console.error(error);
        // alert on error
        $.getScript("js/sweetalert2.all.js",function(){
            Swal.fire({
              title: 'Failure!',
              text: 'There was a failure calling putUserRoutingskillsBulk. Could not update profile.',
              icon: 'error',
              toast: '',
              timer: 3000
            });
          });
    }
}

/**
 * Updates a profile (Primari, Backup, Default, Emergency) of a user (agent) in the Genesys datatable A_PROFILES_AGENTS_ALLOCATION
 * @param {string} profile Profile to be update
 * @param {string} userId The userId of which the profile should be update
 * @param {string} skillsString The new skills
 * @param {string} profficienciesString The new profficiencies
 * @param {} architectApiInstance The architect API instance through which the update should be peformed
 * @returns 
 */
export async function updateProfileInDatatable(profile, userId, skillsString, profficienciesString, architectApiInstance) {
    let datatableId;
    // Retrieve the datatable id
    try {
        let opts = {
            "name": "A_PROFILES_AGENTS_ALLOCATION" // The name of the databable with the profiles
        };
        let datatable = await architectApiInstance.getFlowsDatatables(opts);
        datatableId = datatable.entities[0].id;
    } catch (error) {
        console.log("There was a failure calling getFlowsDatatables");
        console.error(error);
        return;
    }
    let agentRow = {
        'key': userId,
        'PROFILE_ACTIVE': profile.toUpperCase()
    };
    let userFound = false;
    // Retrieve the original row from the datatable for the given user
    try {
        let opts = { 
            'showbrief': false // Boolean | if true returns just the key field for the row
        };
        agentRow = await architectApiInstance.getFlowsDatatableRow(datatableId, userId, opts);
        userFound = true;
    } catch (error) {
        console.log('There was a failure calling getFlowsDatatableRow. Row might now exist for given user. Applying default row');
        console.error(error);
    }
    // Adjust the row depending on the updated skills and proficiencies
    switch (profile) {
        case "Primary":
            agentRow.PRIMARY_SKILLS = skillsString;
            agentRow.PRIMARY_VALUES = profficienciesString;
            break;
        case "Backup":
            agentRow.BACKUP_SKILLS = skillsString;
            agentRow.BACKUP_VALUES = profficienciesString;
            break;
        case "Default":
            agentRow.DEFAULT_SKILLS = skillsString;
            agentRow.DEFAULT_VALUES = profficienciesString;
            break;
        case "Emergency":
            agentRow.EMERGENCY_SKILLS = skillsString;
            agentRow.EMERGENCY_VALUES = profficienciesString;
            break;
        default:
            break;
    }
    // Update/create the row in the datatable in Genesys
    try {
        if (userFound) { // If user already has a datatable row
            let newRow = {
                'body': agentRow
            };
            // Update the active profile in Genesys
            await architectApiInstance.putFlowsDatatableRow(datatableId, userId, newRow);
        } else { // Create a new (mostly empty) row for the given user
            await architectApiInstance.postFlowsDatatableRows(datatableId, agentRow);
        }
    } catch (error) {
        console.log(`There was a failure updating/creating the row in the datatable for this user: ${userId}`);
        console.error(error);
        return;
    }
}