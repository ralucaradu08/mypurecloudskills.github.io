import { applyCurrentActiveProfile, updateDropDownHtml } from "./dropDownProfileUpdate.js";
import { applyProfileToUser } from "./changeProfile.js";
const platformClient = require("platformClient");

let userApiInstance = new platformClient.UsersApi();
let routingApiInstance = new platformClient.RoutingApi();
let architectApiInstance = new platformClient.ArchitectApi();

// Apply the currently active profile to the dropdown menu
applyCurrentActiveProfile(userApiInstance, architectApiInstance);

let agentActiveProfile = window.sessionStorage.getItem("agentActiveProfile");

// Attach event listener to each dropdown profile picker button
document.querySelectorAll('.ddProfilePick').forEach(button => {
    button.addEventListener('click', updateActiveProfile);
});

// (Event listener for the dropdown profile picker)
// Change the currently active profile to the one clicked

async function updateActiveProfile() {
    
    let userId;
    let profile;
   

    // Retrieves the userId of the currently logged in user
    // Value NA is saved only on error

    if (agentActiveProfile != "NA") {
        profile = this.textContent; // Profile to be assigned depending on the button that was clicked
    } else {
        profile = "NA";
    }

    try {
        let data = await userApiInstance.getUsersMe();
        userId = data.id;
    } catch (error) {
        console.log("There was a failure calling getAuthorizationSubjectsMe. Could not retrieve userId.");
        console.error(error);
        return;
    }
    
    // Apply profile in Genesys

    if (agentActiveProfile != "NA") {
        applyProfileToUser(profile, userId, architectApiInstance, routingApiInstance, userApiInstance);
    } else { // profile configuration not defined in datatable
        
        $.getScript("js/sweetalert2.all.js",function(){
            Swal.fire({
              title: 'Skills Allocation is NOT Defined for Your User!',
              text: 'Please contact your supervisor about this!',
              icon: 'error',
              toast: '',
              timer: 5000
            });
          });
    }

   
//    if ((document.getElementById("profileDisplay") != undefined) && (document.getElementById("profileDisplay") != null)){
//            document.getElementById("profileDisplay").innerHTML = `Your current profile is: ${profile.toUpperCase()}`; // Only applied on select_profile.html
//    }
}
