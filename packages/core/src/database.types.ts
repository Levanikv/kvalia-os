export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      appels_outils: {
        Row: {
          canal: Database["public"]["Enums"]["canal"]
          created_at: string
          duree_ms: number | null
          entree: Json | null
          id: string
          outil: string
          sortie: Json | null
          succes: boolean
          user_id: string
        }
        Insert: {
          canal?: Database["public"]["Enums"]["canal"]
          created_at?: string
          duree_ms?: number | null
          entree?: Json | null
          id?: string
          outil: string
          sortie?: Json | null
          succes?: boolean
          user_id: string
        }
        Update: {
          canal?: Database["public"]["Enums"]["canal"]
          created_at?: string
          duree_ms?: number | null
          entree?: Json | null
          id?: string
          outil?: string
          sortie?: Json | null
          succes?: boolean
          user_id?: string
        }
        Relationships: []
      }
      budgets: {
        Row: {
          categorie_id: string
          id: string
          mois: string
          montant: number
          user_id: string
        }
        Insert: {
          categorie_id: string
          id?: string
          mois: string
          montant: number
          user_id: string
        }
        Update: {
          categorie_id?: string
          id?: string
          mois?: string
          montant?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_categorie_id_fkey"
            columns: ["categorie_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          couleur: string | null
          icone: string | null
          id: string
          nom: string
          ordre: number
          parent_id: string | null
          perimetre: Database["public"]["Enums"]["perimetre"] | null
          user_id: string
        }
        Insert: {
          couleur?: string | null
          icone?: string | null
          id?: string
          nom: string
          ordre?: number
          parent_id?: string | null
          perimetre?: Database["public"]["Enums"]["perimetre"] | null
          user_id: string
        }
        Update: {
          couleur?: string | null
          icone?: string | null
          id?: string
          nom?: string
          ordre?: number
          parent_id?: string | null
          perimetre?: Database["public"]["Enums"]["perimetre"] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      comptes: {
        Row: {
          actif: boolean
          banque: string | null
          consentement_expire: string | null
          created_at: string
          derniere_sync: string | null
          devise: string
          externe_id: string | null
          id: string
          nom: string
          perimetre: Database["public"]["Enums"]["perimetre"]
          solde: number | null
          source: Database["public"]["Enums"]["compte_source"]
          updated_at: string
          user_id: string
        }
        Insert: {
          actif?: boolean
          banque?: string | null
          consentement_expire?: string | null
          created_at?: string
          derniere_sync?: string | null
          devise?: string
          externe_id?: string | null
          id?: string
          nom: string
          perimetre?: Database["public"]["Enums"]["perimetre"]
          solde?: number | null
          source?: Database["public"]["Enums"]["compte_source"]
          updated_at?: string
          user_id: string
        }
        Update: {
          actif?: boolean
          banque?: string | null
          consentement_expire?: string | null
          created_at?: string
          derniere_sync?: string | null
          devise?: string
          externe_id?: string | null
          id?: string
          nom?: string
          perimetre?: Database["public"]["Enums"]["perimetre"]
          solde?: number | null
          source?: Database["public"]["Enums"]["compte_source"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      connexions_externes: {
        Row: {
          acces_expire_le: string | null
          created_at: string
          derniere_sync: string | null
          fournisseur: string
          id: string
          jeton_acces: string | null
          jeton_rafraichissement: string | null
          meta: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          acces_expire_le?: string | null
          created_at?: string
          derniere_sync?: string | null
          fournisseur: string
          id?: string
          jeton_acces?: string | null
          jeton_rafraichissement?: string | null
          meta?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          acces_expire_le?: string | null
          created_at?: string
          derniere_sync?: string | null
          fournisseur?: string
          id?: string
          jeton_acces?: string | null
          jeton_rafraichissement?: string | null
          meta?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          created_at: string
          embedding: string | null
          entite: string | null
          expiration: string | null
          fichier_path: string | null
          id: string
          mime: string | null
          numero: string | null
          tags: string[]
          texte: string | null
          titre: string
          type: Database["public"]["Enums"]["document_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          embedding?: string | null
          entite?: string | null
          expiration?: string | null
          fichier_path?: string | null
          id?: string
          mime?: string | null
          numero?: string | null
          tags?: string[]
          texte?: string | null
          titre: string
          type?: Database["public"]["Enums"]["document_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          embedding?: string | null
          entite?: string | null
          expiration?: string | null
          fichier_path?: string | null
          id?: string
          mime?: string | null
          numero?: string | null
          tags?: string[]
          texte?: string | null
          titre?: string
          type?: Database["public"]["Enums"]["document_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      evenements_cache: {
        Row: {
          calendrier: string | null
          debut: string
          fin: string | null
          id: string
          lieu: string | null
          synced_at: string
          titre: string
          user_id: string
        }
        Insert: {
          calendrier?: string | null
          debut: string
          fin?: string | null
          id: string
          lieu?: string | null
          synced_at?: string
          titre: string
          user_id: string
        }
        Update: {
          calendrier?: string | null
          debut?: string
          fin?: string | null
          id?: string
          lieu?: string | null
          synced_at?: string
          titre?: string
          user_id?: string
        }
        Relationships: []
      }
      exercices_ref: {
        Row: {
          alias: string[]
          compose: boolean
          consignes: string[]
          description: string | null
          difficulte: string | null
          equipement: string | null
          erreurs: string[]
          gif_url: string | null
          id: string
          image_url: string | null
          image_url_f: string | null
          met: number
          muscles: string[]
          muscles_secondaires: string[]
          nom: string
          nom_fr: string | null
          partie_corps: string | null
          reperes: string[]
          respiration: string | null
          source: string
          unilateral: boolean
          updated_at: string
          video_url: string | null
          video_url_f: string | null
        }
        Insert: {
          alias?: string[]
          compose?: boolean
          consignes?: string[]
          description?: string | null
          difficulte?: string | null
          equipement?: string | null
          erreurs?: string[]
          gif_url?: string | null
          id: string
          image_url?: string | null
          image_url_f?: string | null
          met?: number
          muscles?: string[]
          muscles_secondaires?: string[]
          nom: string
          nom_fr?: string | null
          partie_corps?: string | null
          reperes?: string[]
          respiration?: string | null
          source?: string
          unilateral?: boolean
          updated_at?: string
          video_url?: string | null
          video_url_f?: string | null
        }
        Update: {
          alias?: string[]
          compose?: boolean
          consignes?: string[]
          description?: string | null
          difficulte?: string | null
          equipement?: string | null
          erreurs?: string[]
          gif_url?: string | null
          id?: string
          image_url?: string | null
          image_url_f?: string | null
          met?: number
          muscles?: string[]
          muscles_secondaires?: string[]
          nom?: string
          nom_fr?: string | null
          partie_corps?: string | null
          reperes?: string[]
          respiration?: string | null
          source?: string
          unilateral?: boolean
          updated_at?: string
          video_url?: string | null
          video_url_f?: string | null
        }
        Relationships: []
      }
      exercices_seance: {
        Row: {
          charge_kg: number | null
          duree_s: number | null
          exercice_id: string
          fait: boolean
          fait_le: string | null
          id: string
          kcal: number | null
          ordre: number
          realise: Json | null
          repos_s: number
          reps: string
          seance_id: string
          series: number
          substitut_de: string | null
          user_id: string
        }
        Insert: {
          charge_kg?: number | null
          duree_s?: number | null
          exercice_id: string
          fait?: boolean
          fait_le?: string | null
          id?: string
          kcal?: number | null
          ordre?: number
          realise?: Json | null
          repos_s?: number
          reps?: string
          seance_id: string
          series?: number
          substitut_de?: string | null
          user_id: string
        }
        Update: {
          charge_kg?: number | null
          duree_s?: number | null
          exercice_id?: string
          fait?: boolean
          fait_le?: string | null
          id?: string
          kcal?: number | null
          ordre?: number
          realise?: Json | null
          repos_s?: number
          reps?: string
          seance_id?: string
          series?: number
          substitut_de?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercices_seance_exercice_id_fkey"
            columns: ["exercice_id"]
            isOneToOne: false
            referencedRelation: "exercices_ref"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercices_seance_seance_id_fkey"
            columns: ["seance_id"]
            isOneToOne: false
            referencedRelation: "seances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercices_seance_substitut_de_fkey"
            columns: ["substitut_de"]
            isOneToOne: false
            referencedRelation: "exercices_ref"
            referencedColumns: ["id"]
          },
        ]
      }
      factures: {
        Row: {
          client: string | null
          created_at: string
          document_id: string | null
          emise_le: string | null
          externe_id: string
          id: string
          montant_ht: number
          montant_ttc: number
          numero: string | null
          source: Database["public"]["Enums"]["compte_source"]
          statut: string
          titre: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          client?: string | null
          created_at?: string
          document_id?: string | null
          emise_le?: string | null
          externe_id: string
          id?: string
          montant_ht?: number
          montant_ttc?: number
          numero?: string | null
          source?: Database["public"]["Enums"]["compte_source"]
          statut: string
          titre?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          client?: string | null
          created_at?: string
          document_id?: string | null
          emise_le?: string | null
          externe_id?: string
          id?: string
          montant_ht?: number
          montant_ttc?: number
          numero?: string | null
          source?: Database["public"]["Enums"]["compte_source"]
          statut?: string
          titre?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "factures_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      habitudes: {
        Row: {
          actif: boolean
          created_at: string
          id: string
          moment: Database["public"]["Enums"]["moment_journee"]
          nom: string
          non_negociable: boolean
          ordre: number
          updated_at: string
          user_id: string
        }
        Insert: {
          actif?: boolean
          created_at?: string
          id?: string
          moment?: Database["public"]["Enums"]["moment_journee"]
          nom: string
          non_negociable?: boolean
          ordre?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          actif?: boolean
          created_at?: string
          id?: string
          moment?: Database["public"]["Enums"]["moment_journee"]
          nom?: string
          non_negociable?: boolean
          ordre?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      habitudes_log: {
        Row: {
          fait: boolean
          habitude_id: string
          id: string
          jour: string
          user_id: string
        }
        Insert: {
          fait?: boolean
          habitude_id: string
          id?: string
          jour?: string
          user_id: string
        }
        Update: {
          fait?: boolean
          habitude_id?: string
          id?: string
          jour?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habitudes_log_habitude_id_fkey"
            columns: ["habitude_id"]
            isOneToOne: false
            referencedRelation: "habitudes"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredients: {
        Row: {
          id: string
          optionnel: boolean
          produit_id: string
          quantite: number
          recette_id: string
          unite: string | null
          user_id: string
        }
        Insert: {
          id?: string
          optionnel?: boolean
          produit_id: string
          quantite: number
          recette_id: string
          unite?: string | null
          user_id: string
        }
        Update: {
          id?: string
          optionnel?: boolean
          produit_id?: string
          quantite?: number
          recette_id?: string
          unite?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingredients_produit_id_fkey"
            columns: ["produit_id"]
            isOneToOne: false
            referencedRelation: "produits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingredients_recette_id_fkey"
            columns: ["recette_id"]
            isOneToOne: false
            referencedRelation: "recettes"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_repas: {
        Row: {
          created_at: string
          gluc: number | null
          id: string
          jour: string
          kcal: number | null
          libelle: string | null
          lip: number | null
          portions: number
          produit_id: string | null
          prot: number | null
          recette_id: string | null
          repas: Database["public"]["Enums"]["repas_type"]
          source: Database["public"]["Enums"]["journal_source"]
          user_id: string
        }
        Insert: {
          created_at?: string
          gluc?: number | null
          id?: string
          jour?: string
          kcal?: number | null
          libelle?: string | null
          lip?: number | null
          portions?: number
          produit_id?: string | null
          prot?: number | null
          recette_id?: string | null
          repas: Database["public"]["Enums"]["repas_type"]
          source?: Database["public"]["Enums"]["journal_source"]
          user_id: string
        }
        Update: {
          created_at?: string
          gluc?: number | null
          id?: string
          jour?: string
          kcal?: number | null
          libelle?: string | null
          lip?: number | null
          portions?: number
          produit_id?: string | null
          prot?: number | null
          recette_id?: string | null
          repas?: Database["public"]["Enums"]["repas_type"]
          source?: Database["public"]["Enums"]["journal_source"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_repas_produit_id_fkey"
            columns: ["produit_id"]
            isOneToOne: false
            referencedRelation: "produits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_repas_recette_id_fkey"
            columns: ["recette_id"]
            isOneToOne: false
            referencedRelation: "recettes"
            referencedColumns: ["id"]
          },
        ]
      }
      lignes: {
        Row: {
          coche: boolean
          created_at: string
          id: string
          liste_id: string
          manque: boolean
          origine: Database["public"]["Enums"]["ligne_origine"]
          produit_id: string
          quantite: number
          unite: string | null
          user_id: string
        }
        Insert: {
          coche?: boolean
          created_at?: string
          id?: string
          liste_id: string
          manque?: boolean
          origine?: Database["public"]["Enums"]["ligne_origine"]
          produit_id: string
          quantite?: number
          unite?: string | null
          user_id: string
        }
        Update: {
          coche?: boolean
          created_at?: string
          id?: string
          liste_id?: string
          manque?: boolean
          origine?: Database["public"]["Enums"]["ligne_origine"]
          produit_id?: string
          quantite?: number
          unite?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lignes_liste_id_fkey"
            columns: ["liste_id"]
            isOneToOne: false
            referencedRelation: "listes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lignes_produit_id_fkey"
            columns: ["produit_id"]
            isOneToOne: false
            referencedRelation: "produits"
            referencedColumns: ["id"]
          },
        ]
      }
      listes: {
        Row: {
          creee_le: string
          etat: Database["public"]["Enums"]["liste_etat"]
          faite_le: string | null
          id: string
          user_id: string
        }
        Insert: {
          creee_le?: string
          etat?: Database["public"]["Enums"]["liste_etat"]
          faite_le?: string | null
          id?: string
          user_id: string
        }
        Update: {
          creee_le?: string
          etat?: Database["public"]["Enums"]["liste_etat"]
          faite_le?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      notes_frais: {
        Row: {
          commentaire: string | null
          created_at: string
          externe_id: string
          id: string
          jour: string | null
          montant: number
          montant_tva: number
          nom: string | null
          source: Database["public"]["Enums"]["compte_source"]
          statut: string | null
          statut_paiement: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          commentaire?: string | null
          created_at?: string
          externe_id: string
          id?: string
          jour?: string | null
          montant?: number
          montant_tva?: number
          nom?: string | null
          source?: Database["public"]["Enums"]["compte_source"]
          statut?: string | null
          statut_paiement?: string | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          commentaire?: string | null
          created_at?: string
          externe_id?: string
          id?: string
          jour?: string | null
          montant?: number
          montant_tva?: number
          nom?: string | null
          source?: Database["public"]["Enums"]["compte_source"]
          statut?: string | null
          statut_paiement?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      objectifs: {
        Row: {
          actif: boolean
          cible: number | null
          created_at: string
          echeance: string | null
          id: string
          titre: string
          type: Database["public"]["Enums"]["objectif_type"]
          unite: string | null
          updated_at: string
          user_id: string
          valeur: number
        }
        Insert: {
          actif?: boolean
          cible?: number | null
          created_at?: string
          echeance?: string | null
          id?: string
          titre: string
          type?: Database["public"]["Enums"]["objectif_type"]
          unite?: string | null
          updated_at?: string
          user_id: string
          valeur?: number
        }
        Update: {
          actif?: boolean
          cible?: number | null
          created_at?: string
          echeance?: string | null
          id?: string
          titre?: string
          type?: Database["public"]["Enums"]["objectif_type"]
          unite?: string | null
          updated_at?: string
          user_id?: string
          valeur?: number
        }
        Relationships: []
      }
      pesees: {
        Row: {
          id: string
          jour: string
          note: string | null
          poids_kg: number
          user_id: string
        }
        Insert: {
          id?: string
          jour?: string
          note?: string | null
          poids_kg: number
          user_id: string
        }
        Update: {
          id?: string
          jour?: string
          note?: string | null
          poids_kg?: number
          user_id?: string
        }
        Relationships: []
      }
      plans_repas: {
        Row: {
          created_at: string
          genere_par: string | null
          id: string
          semaine: string
          user_id: string
          valide: boolean
        }
        Insert: {
          created_at?: string
          genere_par?: string | null
          id?: string
          semaine: string
          user_id: string
          valide?: boolean
        }
        Update: {
          created_at?: string
          genere_par?: string | null
          id?: string
          semaine?: string
          user_id?: string
          valide?: boolean
        }
        Relationships: []
      }
      plans_repas_lignes: {
        Row: {
          id: string
          jour: string
          plan_id: string
          portions: number
          pris: boolean
          recette_id: string
          repas: Database["public"]["Enums"]["repas_type"]
          user_id: string
        }
        Insert: {
          id?: string
          jour: string
          plan_id: string
          portions?: number
          pris?: boolean
          recette_id: string
          repas: Database["public"]["Enums"]["repas_type"]
          user_id: string
        }
        Update: {
          id?: string
          jour?: string
          plan_id?: string
          portions?: number
          pris?: boolean
          recette_id?: string
          repas?: Database["public"]["Enums"]["repas_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plans_repas_lignes_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans_repas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plans_repas_lignes_recette_id_fkey"
            columns: ["recette_id"]
            isOneToOne: false
            referencedRelation: "recettes"
            referencedColumns: ["id"]
          },
        ]
      }
      produits: {
        Row: {
          code_barres: string | null
          created_at: string
          gluc_100: number | null
          id: string
          kcal_100: number | null
          lip_100: number | null
          nom: string
          prot_100: number | null
          rayon: string | null
          substituts: string[]
          unite: string
          updated_at: string
          user_id: string
        }
        Insert: {
          code_barres?: string | null
          created_at?: string
          gluc_100?: number | null
          id?: string
          kcal_100?: number | null
          lip_100?: number | null
          nom: string
          prot_100?: number | null
          rayon?: string | null
          substituts?: string[]
          unite?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          code_barres?: string | null
          created_at?: string
          gluc_100?: number | null
          id?: string
          kcal_100?: number | null
          lip_100?: number | null
          nom?: string
          prot_100?: number | null
          rayon?: string | null
          substituts?: string[]
          unite?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profils: {
        Row: {
          contexte_agent: string | null
          created_at: string
          id: string
          prenom: string | null
          reglages: Json
          updated_at: string
        }
        Insert: {
          contexte_agent?: string | null
          created_at?: string
          id: string
          prenom?: string | null
          reglages?: Json
          updated_at?: string
        }
        Update: {
          contexte_agent?: string | null
          created_at?: string
          id?: string
          prenom?: string | null
          reglages?: Json
          updated_at?: string
        }
        Relationships: []
      }
      programmes: {
        Row: {
          actif: boolean
          created_at: string
          debut: string
          fin: string | null
          genere_par: string | null
          id: string
          materiel: string[]
          nom: string
          objectif_id: string | null
          rythme: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          actif?: boolean
          created_at?: string
          debut: string
          fin?: string | null
          genere_par?: string | null
          id?: string
          materiel?: string[]
          nom: string
          objectif_id?: string | null
          rythme?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          actif?: boolean
          created_at?: string
          debut?: string
          fin?: string | null
          genere_par?: string | null
          id?: string
          materiel?: string[]
          nom?: string
          objectif_id?: string | null
          rythme?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "programmes_objectif_id_fkey"
            columns: ["objectif_id"]
            isOneToOne: false
            referencedRelation: "objectifs"
            referencedColumns: ["id"]
          },
        ]
      }
      recettes: {
        Row: {
          actif: boolean
          batch: boolean
          conservation_jours: number | null
          created_at: string
          id: string
          instructions: string | null
          nom: string
          portions: number
          temporaire: boolean
          type: Database["public"]["Enums"]["repas_type"]
          updated_at: string
          user_id: string
          version_de: string | null
        }
        Insert: {
          actif?: boolean
          batch?: boolean
          conservation_jours?: number | null
          created_at?: string
          id?: string
          instructions?: string | null
          nom: string
          portions?: number
          temporaire?: boolean
          type: Database["public"]["Enums"]["repas_type"]
          updated_at?: string
          user_id: string
          version_de?: string | null
        }
        Update: {
          actif?: boolean
          batch?: boolean
          conservation_jours?: number | null
          created_at?: string
          id?: string
          instructions?: string | null
          nom?: string
          portions?: number
          temporaire?: boolean
          type?: Database["public"]["Enums"]["repas_type"]
          updated_at?: string
          user_id?: string
          version_de?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recettes_version_de_fkey"
            columns: ["version_de"]
            isOneToOne: false
            referencedRelation: "recettes"
            referencedColumns: ["id"]
          },
        ]
      }
      regles_categorisation: {
        Row: {
          categorie_id: string
          created_at: string
          id: string
          motif: string
          priorite: number
          user_id: string
        }
        Insert: {
          categorie_id: string
          created_at?: string
          id?: string
          motif: string
          priorite?: number
          user_id: string
        }
        Update: {
          categorie_id?: string
          created_at?: string
          id?: string
          motif?: string
          priorite?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "regles_categorisation_categorie_id_fkey"
            columns: ["categorie_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      seances: {
        Row: {
          bloc: number | null
          created_at: string
          debut_le: string | null
          duree_min: number | null
          etat: Database["public"]["Enums"]["seance_etat"]
          faite_le: string | null
          focus: string | null
          id: string
          jour: string
          kcal: number | null
          notes: string | null
          programme_id: string | null
          ressenti: number | null
          semaine: number | null
          titre: string | null
          type: Database["public"]["Enums"]["seance_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          bloc?: number | null
          created_at?: string
          debut_le?: string | null
          duree_min?: number | null
          etat?: Database["public"]["Enums"]["seance_etat"]
          faite_le?: string | null
          focus?: string | null
          id?: string
          jour: string
          kcal?: number | null
          notes?: string | null
          programme_id?: string | null
          ressenti?: number | null
          semaine?: number | null
          titre?: string | null
          type: Database["public"]["Enums"]["seance_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          bloc?: number | null
          created_at?: string
          debut_le?: string | null
          duree_min?: number | null
          etat?: Database["public"]["Enums"]["seance_etat"]
          faite_le?: string | null
          focus?: string | null
          id?: string
          jour?: string
          kcal?: number | null
          notes?: string | null
          programme_id?: string | null
          ressenti?: number | null
          semaine?: number | null
          titre?: string | null
          type?: Database["public"]["Enums"]["seance_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seances_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
        ]
      }
      stock: {
        Row: {
          produit_id: string
          quantite: number
          unite: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          produit_id: string
          quantite?: number
          unite?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          produit_id?: string
          quantite?: number
          unite?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_produit_id_fkey"
            columns: ["produit_id"]
            isOneToOne: false
            referencedRelation: "produits"
            referencedColumns: ["id"]
          },
        ]
      }
      taches: {
        Row: {
          created_at: string
          document_id: string | null
          due: string | null
          evenement_id: string | null
          fait: boolean
          fait_le: string | null
          id: string
          priorite: Database["public"]["Enums"]["priorite"]
          titre: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document_id?: string | null
          due?: string | null
          evenement_id?: string | null
          fait?: boolean
          fait_le?: string | null
          id?: string
          priorite?: Database["public"]["Enums"]["priorite"]
          titre: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          document_id?: string | null
          due?: string | null
          evenement_id?: string | null
          fait?: boolean
          fait_le?: string | null
          id?: string
          priorite?: Database["public"]["Enums"]["priorite"]
          titre?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "taches_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      trajets: {
        Row: {
          aller_retour: boolean
          arrivee: string | null
          brut: Json | null
          commentaire: string | null
          created_at: string
          depart: string | null
          distance_km: number
          externe_id: string
          id: string
          jour: string
          montant: number | null
          source: Database["public"]["Enums"]["compte_source"]
          updated_at: string
          user_id: string
        }
        Insert: {
          aller_retour?: boolean
          arrivee?: string | null
          brut?: Json | null
          commentaire?: string | null
          created_at?: string
          depart?: string | null
          distance_km?: number
          externe_id: string
          id?: string
          jour: string
          montant?: number | null
          source?: Database["public"]["Enums"]["compte_source"]
          updated_at?: string
          user_id: string
        }
        Update: {
          aller_retour?: boolean
          arrivee?: string | null
          brut?: Json | null
          commentaire?: string | null
          created_at?: string
          depart?: string | null
          distance_km?: number
          externe_id?: string
          id?: string
          jour?: string
          montant?: number | null
          source?: Database["public"]["Enums"]["compte_source"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          categorie_externe: string | null
          categorie_id: string | null
          categorise_par: Database["public"]["Enums"]["categorise_par"] | null
          compte_id: string
          created_at: string
          document_id: string | null
          empreinte: string
          externe_id: string | null
          id: string
          jour: string
          libelle: string
          libelle_brut: string | null
          montant: number
          nb_justificatifs: number | null
          recurrente: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          categorie_externe?: string | null
          categorie_id?: string | null
          categorise_par?: Database["public"]["Enums"]["categorise_par"] | null
          compte_id: string
          created_at?: string
          document_id?: string | null
          empreinte: string
          externe_id?: string | null
          id?: string
          jour: string
          libelle: string
          libelle_brut?: string | null
          montant: number
          nb_justificatifs?: number | null
          recurrente?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          categorie_externe?: string | null
          categorie_id?: string | null
          categorise_par?: Database["public"]["Enums"]["categorise_par"] | null
          compte_id?: string
          created_at?: string
          document_id?: string | null
          empreinte?: string
          externe_id?: string | null
          id?: string
          jour?: string
          libelle?: string
          libelle_brut?: string | null
          montant?: number
          nb_justificatifs?: number | null
          recurrente?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_categorie_id_fkey"
            columns: ["categorie_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_compte_id_fkey"
            columns: ["compte_id"]
            isOneToOne: false
            referencedRelation: "comptes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      vue_jour: { Args: { p_jour?: string; p_user_id?: string }; Returns: Json }
    }
    Enums: {
      canal: "claude" | "siri" | "telegram" | "alexa" | "app" | "job"
      categorise_par: "regle" | "agent" | "manuel"
      compte_source: "csv" | "enable_banking" | "tiime" | "manuel"
      document_type:
        | "identite"
        | "logement"
        | "voiture"
        | "sante"
        | "sasu"
        | "banque"
        | "contrat"
        | "voyage"
        | "facture"
        | "autre"
      journal_source: "plan" | "scan" | "phrase" | "manuel"
      ligne_origine: "manuel" | "plan" | "agent" | "siri" | "alexa" | "telegram"
      liste_etat: "active" | "faite" | "archivee"
      moment_journee: "matin" | "midi" | "soir" | "coucher" | "libre"
      objectif_type: "sport" | "epargne" | "habitude" | "autre"
      perimetre: "perso" | "sasu"
      priorite: "basse" | "normale" | "haute"
      repas_type: "petit_dej" | "dejeuner" | "diner" | "encas"
      seance_etat: "prevue" | "en_cours" | "faite" | "sautee"
      seance_type:
        | "upper"
        | "lower"
        | "push"
        | "pull"
        | "legs"
        | "full"
        | "boxe"
        | "hiit"
        | "maison"
        | "cardio"
        | "repos"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      canal: ["claude", "siri", "telegram", "alexa", "app", "job"],
      categorise_par: ["regle", "agent", "manuel"],
      compte_source: ["csv", "enable_banking", "tiime", "manuel"],
      document_type: [
        "identite",
        "logement",
        "voiture",
        "sante",
        "sasu",
        "banque",
        "contrat",
        "voyage",
        "facture",
        "autre",
      ],
      journal_source: ["plan", "scan", "phrase", "manuel"],
      ligne_origine: ["manuel", "plan", "agent", "siri", "alexa", "telegram"],
      liste_etat: ["active", "faite", "archivee"],
      moment_journee: ["matin", "midi", "soir", "coucher", "libre"],
      objectif_type: ["sport", "epargne", "habitude", "autre"],
      perimetre: ["perso", "sasu"],
      priorite: ["basse", "normale", "haute"],
      repas_type: ["petit_dej", "dejeuner", "diner", "encas"],
      seance_etat: ["prevue", "en_cours", "faite", "sautee"],
      seance_type: [
        "upper",
        "lower",
        "push",
        "pull",
        "legs",
        "full",
        "boxe",
        "hiit",
        "maison",
        "cardio",
        "repos",
      ],
    },
  },
} as const
