"""
Change MarkingPaper FK from catalog.ExamSessionSubjectProduct to store.Product.

Database operations:
- Rename column exam_session_subject_product_id -> store_product_id
- Drop any old FK constraints referencing exam_session_subject_product tables
- Add new FK constraint pointing to acted.products

Uses conditional SQL so it's safe to run on databases where the column
was already renamed manually.
"""
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('marking', '0002_migrate_to_acted_schema'),
        ('store', '0001_initial'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    sql="""
                        DO $$
                        DECLARE
                            _constraint_name text;
                        BEGIN
                            -- Rename column if old name still exists
                            IF EXISTS (
                                SELECT 1 FROM information_schema.columns
                                WHERE table_schema = 'acted'
                                  AND table_name = 'marking_paper'
                                  AND column_name = 'exam_session_subject_product_id'
                            ) THEN
                                ALTER TABLE "acted"."marking_paper"
                                    RENAME COLUMN exam_session_subject_product_id TO store_product_id;
                            END IF;

                            -- Drop ALL FK constraints that reference exam_session_subject_product tables
                            FOR _constraint_name IN
                                SELECT tc.constraint_name
                                FROM information_schema.table_constraints tc
                                JOIN information_schema.constraint_column_usage ccu
                                    ON tc.constraint_name = ccu.constraint_name
                                WHERE tc.table_name = 'marking_paper'
                                  AND tc.constraint_type = 'FOREIGN KEY'
                                  AND ccu.table_name LIKE '%exam_session_subject_product%'
                            LOOP
                                EXECUTE format(
                                    'ALTER TABLE "acted"."marking_paper" DROP CONSTRAINT %I',
                                    _constraint_name
                                );
                            END LOOP;

                            -- Add new FK constraint if it doesn't exist
                            IF NOT EXISTS (
                                SELECT 1 FROM information_schema.table_constraints
                                WHERE constraint_name = 'acted_marking_paper_store_product_id_fk_products_id'
                                  AND table_name = 'marking_paper'
                            ) THEN
                                ALTER TABLE "acted"."marking_paper"
                                    ADD CONSTRAINT "acted_marking_paper_store_product_id_fk_products_id"
                                    FOREIGN KEY (store_product_id)
                                    REFERENCES "acted"."products" (id)
                                    DEFERRABLE INITIALLY DEFERRED;
                            END IF;
                        END
                        $$;
                    """,
                    reverse_sql="""
                        DO $$
                        DECLARE
                            _constraint_name text;
                        BEGIN
                            -- Drop new FK constraint if exists
                            FOR _constraint_name IN
                                SELECT tc.constraint_name
                                FROM information_schema.table_constraints tc
                                WHERE tc.table_name = 'marking_paper'
                                  AND tc.constraint_type = 'FOREIGN KEY'
                                  AND tc.constraint_name = 'acted_marking_paper_store_product_id_fk_products_id'
                            LOOP
                                EXECUTE format(
                                    'ALTER TABLE "acted"."marking_paper" DROP CONSTRAINT %I',
                                    _constraint_name
                                );
                            END LOOP;

                            -- Rename column back
                            IF EXISTS (
                                SELECT 1 FROM information_schema.columns
                                WHERE table_schema = 'acted'
                                  AND table_name = 'marking_paper'
                                  AND column_name = 'store_product_id'
                            ) THEN
                                ALTER TABLE "acted"."marking_paper"
                                    RENAME COLUMN store_product_id TO exam_session_subject_product_id;
                            END IF;

                            -- Re-add old FK constraint
                            IF NOT EXISTS (
                                SELECT 1 FROM information_schema.table_constraints tc
                                JOIN information_schema.constraint_column_usage ccu
                                    ON tc.constraint_name = ccu.constraint_name
                                WHERE tc.table_name = 'marking_paper'
                                  AND tc.constraint_type = 'FOREIGN KEY'
                                  AND ccu.table_name LIKE '%exam_session_subject_product%'
                            ) THEN
                                ALTER TABLE "acted"."marking_paper"
                                    ADD CONSTRAINT "acted_marking_paper_essp_fk"
                                    FOREIGN KEY (exam_session_subject_product_id)
                                    REFERENCES "acted"."exam_session_subject_product" (id)
                                    DEFERRABLE INITIALLY DEFERRED;
                            END IF;
                        END
                        $$;
                    """,
                ),
            ],
            state_operations=[
                migrations.RemoveField(
                    model_name='markingpaper',
                    name='exam_session_subject_product',
                ),
                migrations.AddField(
                    model_name='markingpaper',
                    name='store_product',
                    field=models.ForeignKey(
                        db_column='store_product_id',
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='marking_papers',
                        to='store.product',
                    ),
                    preserve_default=False,
                ),
            ],
        ),
    ]
