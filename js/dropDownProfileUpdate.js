export function updateDropDownHtml(profile) {
    // Change the active element in the dropdown
    let sProfile = "";

    if (profile.length > 0){
        sProfile = profile.charAt(0).toUpperCase()+profile.substring(1).toLowerCase();
    }
    
    document.getElementById("ddPrimary").classList.remove('active');
    document.getElementById("ddBackup").classList.remove('active');
    document.getElementById("ddDefault").classList.remove('active');
    document.getElementById("ddEmergency").classList.remove('active');
    document.getElementById(`dd${sProfile}`).classList.add('active');
}

// Apply the currently active profile to the dropdown menu
export async function applyCurrentActiveProfile(userApiInstance, architectApiInstance) {
    let userId;
    // Retrieve the userId of the currently logged in user update the page
    try {
        let data = await userApiInstance.getUsersMe();
        userId = data.id;
    } catch (error) {
        console.log("There was a failure calling getAuthorizationSubjectsMe. Could not retrieve userId.");
        console.error(error);
        return;
    }

    let datatableId;
    // Retrieve the datatable id
    try {
        let opts = {
            "name": "A_PROFILES_AGENTS_ALLOCATION" // The name of the databable with the profiles
        };
        let data = await architectApiInstance.getFlowsDatatables(opts);
        datatableId = data.entities[0].id;
    } catch (error) {
        console.log("There was a failure calling getFlowsDatatables. Could not get datatableId.");
        console.error(error);
        window.sessionStorage.removeItem("agentActiveProfile");     // clear cache for the Active Profile
        window.sessionStorage.setItem("agentActiveProfile","NA");   // set Active Profile to NA in Session Storage
        return;
    }

    // Retrieve currently active profile and update page
    try {
        let opts = { 
            'showbrief': false // Boolean | if true returns just the key field for the row
        };
        let data = await architectApiInstance.getFlowsDatatableRow(datatableId, userId, opts);
        let lowercaseString = data.PROFILE_ACTIVE.toLowerCase();
        let resultString = lowercaseString.charAt(0).toUpperCase() + lowercaseString.slice(1);

        // set Active Profile for current Agent in Session Storage
        window.sessionStorage.removeItem("agentActiveProfile");     // clear cache for the Active Profile
        window.sessionStorage.setItem("agentActiveProfile",resultString);
        updateDropDownHtml(resultString);
    } catch (error) {
        console.log('There was a failure calling getFlowsDatatableRow. Could not retrieve active profile.');
        console.error(error);
        window.sessionStorage.removeItem("agentActiveProfile");     // clear cache for the Active Profile
        window.sessionStorage.setItem("agentActiveProfile","NA");   // set Active Profile to NA in Session Storage
        return;
    }
}
