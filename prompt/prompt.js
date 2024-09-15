const prompts = {
    post_concussion_evaluation: `
        Based on the medical note provided, explain the clinical decision to order a post-concussion evaluation for the patient. 
        Discuss how this evaluation will help assess the severity of the concussion and guide the overall treatment strategy.
    `,
    dti_brain_mri: `
        Justify the decision to order a 3D Diffusion Tensor Imaging (DTI) brain MRI, considering the patient's history and current symptoms. 
        Explain how this imaging technique can help identify potential microstructural brain injuries and inform the treatment plan.
    `,
    iv_micronutrients_im_vitamins: `
        Review the decision to administer IV micronutrients and intramuscular vitamin injections to the patient. 
        Provide a detailed explanation of how these treatments support recovery, particularly in relation to the patient’s recent health issues and overall condition.
    `,
    neurofeedback_clarity_direct: `
        Elaborate on the rationale for recommending direct neurofeedback therapy using the Clarity Direct machine, as outlined in the patient's medical note. 
        Discuss the scientific basis for this therapy and how it may benefit the patient’s cognitive and emotional recovery.
    `
};

module.exports = {
    prompts
 
};