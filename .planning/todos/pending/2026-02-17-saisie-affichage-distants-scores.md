---
created: 2026-02-17T14:30
title: Saisie et affichage distants des scores
area: remote
files: []
---

## Problem

Actuellement, la saisie des scores et l'affichage des résultats ne fonctionnent pas en mode distant. Les arbitres et officiels doivent avoir un accès physique à l'application pour saisir les scores des matchs. Il n'y a pas de mécanisme permettant à des utilisateurs distants (sur mobile ou autre appareil) de saisir les scores ou de consulter l'affichage public des résultats en temps réel.

Cette fonctionnalité est essentielle pour :
- Permettre aux arbitres sur les pistes de saisir les scores depuis leur téléphone
- Afficher les résultats en temps réel sur des écrans distants (tableau d'affichage public)
- Réduire la dépendance à l'application desktop principale

## Solution

TBD - À définir selon l'architecture existante :
- Évaluer l'utilisation de WebSockets ou Server-Sent Events pour la communication temps réel
- Considérer une API REST pour la saisie des scores
- Implémenter une interface web responsive pour mobile
- Créer un écran d'affichage public dédié (similaire à LiveDashboard mais fonctionnel)
- Gérer l'authentification et les autorisations pour les saisies distantes
- Synchronisation avec la base SQLite locale
