#!/usr/bin/env python3
"""
Sincroniza dados do Órulo (JSON local) para o banco PostgreSQL.
Enriquece cvcrm_empreendimentos com preço, estoque, endereço, unidades.
"""

import json
import os
import sys
import psycopg2
from pathlib import Path

ORULO_DIR = Path("/var/www/pratica/dados_sistema_orulo/empreendimentos")
DB_NAME = "pratica"

def load_json(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except:
        return None

def connect_db():
    return psycopg2.connect(dbname=DB_NAME)

def sync_orulo():
    conn = connect_db()
    cur = conn.cursor()
    
    updated = 0
    not_found = 0
    errors = 0
    
    for folder in sorted(ORULO_DIR.iterdir()):
        if not folder.is_dir():
            continue
        
        details_file = folder / "details.json"
        units_file = folder / "units.json"
        
        if not details_file.exists():
            print(f"  SKIP {folder.name}: no details.json")
            continue
        
        details = load_json(details_file)
        units = load_json(units_file)
        
        if not details:
            print(f"  SKIP {folder.name}: invalid JSON")
            continue
        
        name = details.get("name", "")
        orulo_id = details.get("id", "")
        
        # Build rich data object
        # Build image URLs from default_image
        default_img = details.get("default_image", {})
        image_url = default_img.get("1024x1024") or default_img.get("520x280") or default_img.get("200x140") or ""
        image_thumb = default_img.get("520x280") or default_img.get("200x140") or ""
        
        # Build all image URLs
        all_images = []
        img_base = "https://static.orulo.com.br/images/properties"
        for img in details.get("images", []):
            img_id = img.get("id")
            if img_id:
                all_images.append({
                    "id": img_id,
                    "description": img.get("description", ""),
                    "type": img.get("type", ""),
                    "url": f"{img_base}/large/{img_id}.jpg",
                    "thumb": f"{img_base}/thumb/{img_id}.jpg",
                })
        
        # Floor plans
        floor_plans = []
        for fp in details.get("floor_plans", []):
            fp_id = fp.get("id")
            if fp_id:
                floor_plans.append({
                    "id": fp_id,
                    "description": fp.get("description", ""),
                    "url": f"{img_base}/large/{fp_id}.jpg",
                })
        
        # Files (PDFs etc)
        files = []
        for f in details.get("files", []):
            f_id = f.get("id")
            if f_id:
                files.append({
                    "id": f_id,
                    "name": f.get("name", ""),
                    "type": f.get("type", ""),
                    "url": f"https://www.orulo.com.br/files/{f_id}",
                })
        
        orulo_data = {
            "orulo_id": orulo_id,
            "orulo_url": details.get("orulo_url"),
            "sharing_url": details.get("sharing_url"),
            "webpage": details.get("webpage"),
            "min_price": details.get("min_price"),
            "price_per_m2": details.get("price_per_private_square_meter"),
            "stock": details.get("stock", 0),
            "total_units": details.get("total_units"),
            "apts_per_floor": details.get("apts_per_floor"),
            "number_of_floors": details.get("number_of_floors"),
            "number_of_towers": details.get("number_of_towers"),
            "min_bedrooms": details.get("min_bedrooms"),
            "max_bedrooms": details.get("max_bedrooms"),
            "min_suites": details.get("min_suites"),
            "max_suites": details.get("max_suites"),
            "min_bathrooms": details.get("min_bathrooms"),
            "max_bathrooms": details.get("max_bathrooms"),
            "min_parking": details.get("min_parking"),
            "max_parking": details.get("max_parking"),
            "min_area": details.get("min_area"),
            "max_area": details.get("max_area"),
            "type": details.get("type"),
            "finality": details.get("finality"),
            "status_orulo": details.get("status"),
            "stage": details.get("stage"),
            "launch_date": details.get("launch_date"),
            "opening_date": details.get("opening_date"),
            "last_updated_pricetable": details.get("last_updated_pricetable"),
            "address": details.get("address"),
            "developer": details.get("developer"),
            "features": details.get("features", []),
            "building_features": details.get("building_features", []),
            "unit_features": details.get("unit_features", []),
            "default_image": image_url,
            "default_image_thumb": image_thumb,
            "images": all_images,
            "floor_plans": floor_plans,
            "files": files,
            "typologies": details.get("typologies", []),
            "videos": details.get("videos", []),
            "opportunity": details.get("opportunity"),
        }
        
        # Add units data if available
        if units:
            if isinstance(units, list):
                orulo_data["units"] = units
                orulo_data["units_count"] = len(units)
                # Calculate available units
                available = [u for u in units if u.get("status", "").lower() in ("disponível", "disponivel", "available")]
                orulo_data["available_units"] = len(available)
            elif isinstance(units, dict):
                orulo_data["units_data"] = units
        
        # Build address string
        addr = details.get("address", {})
        endereco = ""
        if addr:
            parts = []
            if addr.get("street_type") and addr.get("street"):
                parts.append(f"{addr['street_type']} {addr['street']}")
            if addr.get("number"):
                parts.append(str(addr["number"]))
            if addr.get("area"):
                parts.append(addr["area"])
            endereco = ", ".join(parts)
        
        cidade = addr.get("city", "São Paulo") if addr else "São Paulo"
        uf = addr.get("state", "SP") if addr else "SP"
        cep = addr.get("zip_code", "") if addr else ""
        
        # Try to match by name (fuzzy)
        cur.execute("""
            SELECT id, nome FROM cvcrm_empreendimentos 
            WHERE LOWER(REPLACE(nome, ' ', '')) = LOWER(REPLACE(%s, ' ', ''))
            OR LOWER(nome) = LOWER(%s)
            LIMIT 1
        """, (name, name))
        
        row = cur.fetchone()
        
        if row:
            empreend_id, db_name = row
            # Update with Órulo data
            cur.execute("""
                UPDATE cvcrm_empreendimentos SET
                    cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || %s::jsonb,
                    descricao = COALESCE(NULLIF(%s, ''), descricao),
                    endereco_completo = COALESCE(NULLIF(%s, ''), endereco_completo),
                    cidade = COALESCE(NULLIF(%s, ''), cidade),
                    uf = COALESCE(NULLIF(%s, ''), uf),
                    cep = COALESCE(NULLIF(%s, ''), cep),
                    total_unidades = COALESCE(%s, total_unidades),
                    updated_at = NOW()
                WHERE id = %s
            """, (
                json.dumps(orulo_data),
                details.get("description", ""),
                endereco,
                cidade,
                uf,
                cep,
                details.get("total_units"),
                empreend_id
            ))
            updated += 1
            stock = orulo_data.get("stock", "?")
            price = orulo_data.get("min_price", "?")
            print(f"  ✅ {name} -> {db_name} (stock: {stock}, price: R${price})")
        else:
            not_found += 1
            print(f"  ❌ {name} -> NOT FOUND in DB")
    
    conn.commit()
    cur.close()
    conn.close()
    
    print(f"\n=== RESULTADO ===")
    print(f"Atualizados: {updated}")
    print(f"Não encontrados: {not_found}")
    print(f"Erros: {errors}")

if __name__ == "__main__":
    print("Sincronizando dados do Órulo...\n")
    sync_orulo()
