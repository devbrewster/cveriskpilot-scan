# -----------------------------------------------------------------------------
# Cloud Build — API enablement + trigger resources
# -----------------------------------------------------------------------------

resource "google_project_service" "cloudbuild" {
  service            = "cloudbuild.googleapis.com"
  disable_on_destroy = false
}

# -----------------------------------------------------------------------------
# CI trigger — runs on all branches and pull requests
# -----------------------------------------------------------------------------

resource "google_cloudbuild_trigger" "ci" {
  name        = "cveriskpilot-ci-${var.environment}"
  description = "CI validation (type-check, lint, test) on all branches/PRs"
  location    = var.region

  github {
    owner = var.github_owner
    name  = var.github_repo

    push {
      branch = ".*"
    }
  }

  filename = "deploy/cloudbuild.yaml"

  depends_on = [google_project_service.cloudbuild]
}

# -----------------------------------------------------------------------------
# Deploy trigger — runs only on push to main
# -----------------------------------------------------------------------------

resource "google_cloudbuild_trigger" "deploy" {
  name        = "cveriskpilot-deploy-${var.environment}"
  description = "Build + deploy to Cloud Run on push to main"
  location    = var.region

  github {
    owner = var.github_owner
    name  = var.github_repo

    push {
      branch = "^main$"
    }
  }

  filename = "deploy/cloudbuild-deploy.yaml"

  substitutions = {
    _ENV    = "production"
    _REGION = var.region
  }

  depends_on = [google_project_service.cloudbuild]
}
