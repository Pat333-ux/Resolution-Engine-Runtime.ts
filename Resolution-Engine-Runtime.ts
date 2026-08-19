// Resolution-Engine-Runtime.ts
// Beast System 3.0 — Resolution Engine Runtime

export class ResolutionEngineRuntime {
  constructor(identityStateEngine, civicGraphRuntime, bindingHub, lucrEngine) {
    this.identityStateEngine = identityStateEngine;
    this.civicGraphRuntime = civicGraphRuntime;
    this.bindingHub = bindingHub;
    this.lucrEngine = lucrEngine;
    this.resolutions = new Map();
  }

  // ---- CREATE RESOLUTION ----
  createResolution(resId, payload) {
    this.resolutions.set(resId, {
      payload,
      impact: 0,
      decay: 0,
      constitutionalStatus: "pending",
      municipalStatus: "pending",
      globalStatus: "pending"
    });
  }

  // ---- GET RESOLUTION ----
  getResolution(resId) {
    return this.resolutions.get(resId);
  }

  // ---- COMPUTE IMPACT ----
  async computeImpact(resId) {
    const res = this.resolutions.get(resId);
    const identities = [...this.identityStateEngine.identities.keys()];

    let totalImpact = 0;

    for (const id of identities) {
      const state = this.identityStateEngine.getState(id);
      const influence = state.wellbeing - state.trauma + state.trustVolatility;
      totalImpact += influence;
    }

    res.impact = totalImpact;
    await this.bindingHub.routeGlobal(resId);
    return totalImpact;
  }

  // ---- APPLY DECAY ----
  async applyDecay(resId) {
    const res = this.resolutions.get(resId);
    res.decay += 1;

    await this.bindingHub.routeResolutionDecay(resId);
    return res.decay;
  }

  // ---- PROPAGATE THROUGH CIVICGRAPH ----
  async propagateResolution(resId) {
    const res = this.resolutions.get(resId);
    const identities = [...this.identityStateEngine.identities.keys()];

    for (const id of identities) {
      const impact = res.impact - res.decay;
      await this.identityStateEngine.updateWellbeing(id, impact);
      await this.identityStateEngine.updateTrauma(id, Math.max(0, res.decay));
    }

    await this.civicGraphRuntime.updateGraph();
  }

  // ---- CONSTITUTIONAL COMPLIANCE ----
  async enforceConstitutionalRules(resId) {
    const res = this.resolutions.get(resId);
    res.constitutionalStatus = "validated";
    await this.bindingHub.routeConstitution(resId);
  }

  // ---- MUNICIPAL COMPLIANCE ----
  async enforceMunicipalRules(resId) {
    const res = this.resolutions.get(resId);
    res.municipalStatus = "aligned";
    await this.bindingHub.routeMunicipal(resId);
  }

  // ---- GLOBAL ALIGNMENT ----
  async enforceGlobalRules(resId) {
    const res = this.resolutions.get(resId);
    res.globalStatus = "aligned";
    await this.bindingHub.routeGlobal(resId);
  }

  // ---- LUCR ECONOMIC EFFECT ----
  async applyLUCREconomics(resId) {
    const res = this.resolutions.get(resId);
    await this.lucrEngine.adjustResolutionEconomics(resId, res.impact - res.decay);
  }

  // ---- FULL RESOLUTION CYCLE ----
  async runResolutionCycle(resId) {
    await this.computeImpact(resId);
    await this.applyDecay(resId);
    await this.propagateResolution(resId);
    await this.enforceConstitutionalRules(resId);
    await this.enforceMunicipalRules(resId);
    await this.enforceGlobalRules(resId);
    await this.applyLUCREconomics(resId);
  }
}
